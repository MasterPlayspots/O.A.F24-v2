// Forum Routes - Berater-Forum CRUD endpoints
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import * as ForumRepo from "../repositories/forum.repository";
import { requireAuth } from "../middleware/auth";

export const forum = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// GET /threads — list threads (paginated, filterable)
// ============================================

const listQuerySchema = z.object({
  kategorie: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
});

forum.get("/threads", async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams);
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ success: false, error: "Ungültige Parameter" }, 400);
  }

  const { kategorie, page, pageSize } = parsed.data;
  const { threads, total } = await ForumRepo.listThreads(c.env.DB, {
    kategorie,
    page,
    pageSize,
  });

  const stats = await ForumRepo.getStats(c.env.DB);

  // Map to frontend-expected shape
  const mapped = threads.map((t) => ({
    id: t.id,
    titel: t.titel,
    kategorie: t.kategorie,
    autor: { name: t.autor_name, avatar: t.autor_avatar },
    erstelltAm: t.created_at,
    antworten: t.post_count,
    letzterBeitrag: t.last_post_at || t.created_at,
    gepinnt: !!t.pinned,
    gesperrt: !!t.locked,
  }));

  return c.json({
    success: true,
    threads: mapped,
    stats,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

// ============================================
// GET /threads/:id — thread detail with posts
// ============================================

forum.get("/threads/:id", async (c) => {
  const threadId = c.req.param("id");
  const { thread, posts } = await ForumRepo.getThread(c.env.DB, threadId);

  if (!thread) {
    return c.json({ success: false, error: "Thread nicht gefunden" }, 404);
  }

  // Increment views (fire and forget)
  c.executionCtx.waitUntil(ForumRepo.incrementViews(c.env.DB, threadId));

  // Map to frontend-expected shape
  const mappedThread = {
    id: thread.id,
    titel: thread.titel,
    kategorie: thread.kategorie,
    kategorieLabel: thread.kategorie,
    autor: { name: thread.autor_name, avatar: thread.autor_avatar, rolle: "Berater" },
    erstelltAm: thread.created_at,
    inhalt: thread.inhalt,
    upvotes: 0,
    downvotes: 0,
    gepinnt: !!thread.pinned,
    gesperrt: !!thread.locked,
    views: thread.views,
    userId: thread.user_id,
  };

  const mappedPosts = posts.map((p) => ({
    id: p.id,
    autor: { name: p.autor_name, avatar: p.autor_avatar, rolle: "Berater" },
    inhalt: p.inhalt,
    erstelltAm: p.created_at,
    upvotes: 0,
    downvotes: 0,
    userId: p.user_id,
  }));

  return c.json({ success: true, thread: mappedThread, antworten: mappedPosts });
});

// ============================================
// POST /threads — create a new thread (auth required)
// ============================================

const createThreadSchema = z.object({
  titel: z.string().min(1).max(200),
  inhalt: z.string().min(1),
  kategorie: z.string().optional(),
});

forum.post("/threads", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = createThreadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Ungültige Eingabe", details: parsed.error.issues },
      400
    );
  }

  const user = c.get("user");
  const id = await ForumRepo.createThread(c.env.DB, user.id, parsed.data);

  return c.json(
    {
      success: true,
      thread: { id },
    },
    201
  );
});

// ============================================
// POST /threads/:id/posts — reply to a thread (auth required)
// Also accept /threads/:id/replies for backward compat
// ============================================

const createPostSchema = z.object({
  inhalt: z.string().min(1),
});

async function replyToThread(
  db: D1Database,
  threadId: string,
  user: { id: string; firstName: string; lastName: string }
) {
  // Helper: returns the new post as API response payload
  return async (body: unknown) => {
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Inhalt ist erforderlich", status: 400 as const };
    }

    const { thread } = await ForumRepo.getThread(db, threadId);
    if (!thread) {
      return { error: "Thread nicht gefunden", status: 404 as const };
    }
    if (thread.locked) {
      return { error: "Thread ist gesperrt", status: 403 as const };
    }

    const postId = await ForumRepo.createPost(db, threadId, user.id, parsed.data.inhalt);

    return {
      status: 201 as const,
      data: {
        success: true,
        antwort: {
          id: postId,
          autor: {
            name: `${user.firstName} ${user.lastName.charAt(0)}.`,
            avatar: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
            rolle: "Berater",
          },
          inhalt: parsed.data.inhalt,
          erstelltAm: new Date().toISOString(),
          upvotes: 0,
          downvotes: 0,
        },
      },
    };
  };
}

forum.post("/threads/:id/posts", requireAuth, async (c) => {
  const threadId = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json();
  const handler = await replyToThread(c.env.DB, threadId, user);
  const result = await handler(body);
  if ("error" in result) {
    return c.json({ success: false, error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

forum.post("/threads/:id/replies", requireAuth, async (c) => {
  const threadId = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json();
  const handler = await replyToThread(c.env.DB, threadId, user);
  const result = await handler(body);
  if ("error" in result) {
    return c.json({ success: false, error: result.error }, result.status);
  }
  return c.json(result.data, result.status);
});

// ============================================
// DELETE /threads/:id — delete own thread
// ============================================

forum.delete("/threads/:id", requireAuth, async (c) => {
  const threadId = c.req.param("id");
  const user = c.get("user");

  // Admins can delete any thread
  const isAdmin = user.role === "admin";
  const deleted = isAdmin
    ? await (async () => {
        // For admin: delete regardless of owner
        const { thread } = await ForumRepo.getThread(c.env.DB, threadId);
        if (!thread) return false;
        return ForumRepo.deleteThread(c.env.DB, threadId, thread.user_id);
      })()
    : await ForumRepo.deleteThread(c.env.DB, threadId, user.id);

  if (!deleted) {
    return c.json({ success: false, error: "Thread nicht gefunden oder keine Berechtigung" }, 404);
  }

  return c.json({ success: true });
});

// ============================================
// DELETE /posts/:id — delete own post
// ============================================

forum.delete("/posts/:id", requireAuth, async (c) => {
  const postId = c.req.param("id");
  const user = c.get("user");
  const deleted = await ForumRepo.deletePost(c.env.DB, postId, user.id);

  if (!deleted) {
    return c.json({ success: false, error: "Beitrag nicht gefunden oder keine Berechtigung" }, 404);
  }

  return c.json({ success: true });
});
