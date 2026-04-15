// News / Aktuelles — public reader + admin CMS.
// BAFA_DB table: news_articles. Frontend expects the NewsArtikel shape
// with camelCase (inhaltMd, veroeffentlichtAm, titelbildUrl) — we map
// from the snake_case DB columns here.
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";

const news = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface NewsRow {
  id: string;
  slug: string;
  titel: string;
  untertitel: string | null;
  zusammenfassung: string | null;
  inhalt_md: string;
  kategorie: string;
  tags: string | null;
  autor: string;
  titelbild_url: string | null;
  veroeffentlicht_am: string;
  created_at: string;
  updated_at: string;
}

function parseTags(raw: string | null): string[] {
  try {
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function shape(r: NewsRow) {
  return {
    id: r.id,
    slug: r.slug,
    titel: r.titel,
    untertitel: r.untertitel ?? undefined,
    zusammenfassung: r.zusammenfassung ?? undefined,
    inhaltMd: r.inhalt_md,
    kategorie: r.kategorie,
    tags: parseTags(r.tags),
    autor: r.autor,
    titelbildUrl: r.titelbild_url ?? undefined,
    veroeffentlichtAm: r.veroeffentlicht_am,
  };
}

// ================ PUBLIC ================

// GET /api/news[?kategorie=]
news.get("/", async (c) => {
  const kategorie = c.req.query("kategorie");
  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (kategorie) {
    conds.push("kategorie = ?");
    params.push(kategorie);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = await c.env.BAFA_DB
    .prepare(
      `SELECT * FROM news_articles
         ${where}
         ORDER BY veroeffentlicht_am DESC
         LIMIT 100`
    )
    .bind(...params)
    .all<NewsRow>();
  return c.json({ success: true, artikel: (rows.results ?? []).map(shape) });
});

// GET /api/news/:slug
news.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await c.env.BAFA_DB
    .prepare("SELECT * FROM news_articles WHERE slug = ?")
    .bind(slug)
    .first<NewsRow>();
  if (!row) return c.json({ success: false, error: "Artikel nicht gefunden" }, 404);
  return c.json({ success: true, artikel: shape(row) });
});

// ================ ADMIN ================

const createSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "slug nur a-z 0-9 -"),
  titel: z.string().min(1).max(300),
  untertitel: z.string().max(500).optional().nullable(),
  zusammenfassung: z.string().max(1000).optional().nullable(),
  inhaltMd: z.string().min(1),
  kategorie: z.string().min(1).max(100).default("allgemein"),
  tags: z.array(z.string()).default([]),
  autor: z.string().max(120).default("fund24"),
  titelbildUrl: z.string().url().optional().nullable(),
});

const updateSchema = createSchema.partial();

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();
admin.use("/*", requireAuth, requireRole("admin"));

// GET /api/admin/news — all articles (any status)
admin.get("/", async (c) => {
  const rows = await c.env.BAFA_DB
    .prepare("SELECT * FROM news_articles ORDER BY veroeffentlicht_am DESC LIMIT 500")
    .all<NewsRow>();
  return c.json({ success: true, artikel: (rows.results ?? []).map(shape) });
});

// POST /api/admin/news
admin.post("/", async (c) => {
  const parsed = createSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const d = parsed.data;
  const id = crypto.randomUUID();

  // Slug collision → 409
  const existing = await c.env.BAFA_DB
    .prepare("SELECT id FROM news_articles WHERE slug = ?")
    .bind(d.slug)
    .first<{ id: string }>();
  if (existing) return c.json({ success: false, error: "slug bereits vergeben" }, 409);

  await c.env.BAFA_DB
    .prepare(
      `INSERT INTO news_articles
         (id, slug, titel, untertitel, zusammenfassung, inhalt_md, kategorie,
          tags, autor, titelbild_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      d.slug,
      d.titel,
      d.untertitel ?? null,
      d.zusammenfassung ?? null,
      d.inhaltMd,
      d.kategorie,
      JSON.stringify(d.tags),
      d.autor,
      d.titelbildUrl ?? null
    )
    .run();

  return c.json({ success: true, id }, 201);
});

// PATCH /api/admin/news/:id
admin.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = updateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const d = parsed.data;
  const cols: Record<string, string> = {
    slug: "slug",
    titel: "titel",
    untertitel: "untertitel",
    zusammenfassung: "zusammenfassung",
    inhaltMd: "inhalt_md",
    kategorie: "kategorie",
    autor: "autor",
    titelbildUrl: "titelbild_url",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [camelKey, dbCol] of Object.entries(cols)) {
    const v = (d as Record<string, unknown>)[camelKey];
    if (v !== undefined) {
      sets.push(`${dbCol} = ?`);
      vals.push(v);
    }
  }
  if (d.tags !== undefined) {
    sets.push("tags = ?");
    vals.push(JSON.stringify(d.tags));
  }
  if (sets.length === 0) return c.json({ success: false, error: "Keine Änderungen" }, 400);
  sets.push("updated_at = datetime('now')");
  vals.push(id);

  const res = await c.env.BAFA_DB
    .prepare(`UPDATE news_articles SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();
  if (!res.meta.changes) return c.json({ success: false, error: "Artikel nicht gefunden" }, 404);
  return c.json({ success: true, ok: true });
});

// DELETE /api/admin/news/:id
admin.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await c.env.BAFA_DB
    .prepare("DELETE FROM news_articles WHERE id = ?")
    .bind(id)
    .run();
  if (!res.meta.changes) return c.json({ success: false, error: "Artikel nicht gefunden" }, 404);
  return c.json({ success: true });
});

export { news, admin as adminNews };
