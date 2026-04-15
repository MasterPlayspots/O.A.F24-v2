// Forum Repository - Data access layer for forum_threads and forum_posts tables

export interface ForumThreadRow {
  id: string;
  user_id: string;
  titel: string;
  inhalt: string;
  kategorie: string;
  pinned: number;
  locked: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface ForumPostRow {
  id: string;
  thread_id: string;
  user_id: string;
  inhalt: string;
  created_at: string;
}

export interface ThreadListItem {
  id: string;
  titel: string;
  kategorie: string;
  pinned: number;
  locked: number;
  views: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  autor_name: string;
  autor_avatar: string;
  post_count: number;
  last_post_at: string | null;
}

export interface ThreadDetail extends ForumThreadRow {
  autor_name: string;
  autor_avatar: string;
}

export interface PostWithAuthor extends ForumPostRow {
  autor_name: string;
  autor_avatar: string;
}

// ============================================
// Reads
// ============================================

export async function listThreads(
  db: D1Database,
  opts: { kategorie?: string; page: number; pageSize: number }
): Promise<{ threads: ThreadListItem[]; total: number }> {
  const { kategorie, page, pageSize } = opts;
  const offset = (page - 1) * pageSize;

  // Build WHERE clause
  const conditions: string[] = [];
  const binds: (string | number)[] = [];

  if (kategorie && kategorie !== "alle") {
    conditions.push("t.kategorie = ?");
    binds.push(kategorie);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM forum_threads t ${whereClause}`)
    .bind(...binds)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Fetch threads with post count, last post date, and author info
  const result = await db
    .prepare(
      `SELECT t.id, t.titel, t.kategorie, t.pinned, t.locked, t.views,
              t.created_at, t.updated_at, t.user_id,
              COALESCE(u.first_name || ' ' || SUBSTR(u.last_name, 1, 1) || '.', 'Unbekannt') as autor_name,
              COALESCE(UPPER(SUBSTR(u.first_name, 1, 1) || SUBSTR(u.last_name, 1, 1)), '??') as autor_avatar,
              (SELECT COUNT(*) FROM forum_posts p WHERE p.thread_id = t.id) as post_count,
              (SELECT MAX(p.created_at) FROM forum_posts p WHERE p.thread_id = t.id) as last_post_at
       FROM forum_threads t
       LEFT JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.pinned DESC, COALESCE(
         (SELECT MAX(p.created_at) FROM forum_posts p WHERE p.thread_id = t.id),
         t.created_at
       ) DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...binds, pageSize, offset)
    .all<ThreadListItem>();

  return { threads: result.results ?? [], total };
}

export async function getThread(
  db: D1Database,
  threadId: string
): Promise<{ thread: ThreadDetail | null; posts: PostWithAuthor[] }> {
  const thread = await db
    .prepare(
      `SELECT t.*,
              COALESCE(u.first_name || ' ' || SUBSTR(u.last_name, 1, 1) || '.', 'Unbekannt') as autor_name,
              COALESCE(UPPER(SUBSTR(u.first_name, 1, 1) || SUBSTR(u.last_name, 1, 1)), '??') as autor_avatar
       FROM forum_threads t
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`
    )
    .bind(threadId)
    .first<ThreadDetail>();

  if (!thread) return { thread: null, posts: [] };

  const posts = await db
    .prepare(
      `SELECT p.*,
              COALESCE(u.first_name || ' ' || SUBSTR(u.last_name, 1, 1) || '.', 'Unbekannt') as autor_name,
              COALESCE(UPPER(SUBSTR(u.first_name, 1, 1) || SUBSTR(u.last_name, 1, 1)), '??') as autor_avatar
       FROM forum_posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.thread_id = ?
       ORDER BY p.created_at ASC`
    )
    .bind(threadId)
    .all<PostWithAuthor>();

  return { thread, posts: posts.results ?? [] };
}

// ============================================
// Writes
// ============================================

export async function createThread(
  db: D1Database,
  userId: string,
  data: { titel: string; inhalt: string; kategorie?: string }
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO forum_threads (id, user_id, titel, inhalt, kategorie)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, userId, data.titel, data.inhalt, data.kategorie || "allgemein")
    .run();
  return id;
}

export async function createPost(
  db: D1Database,
  threadId: string,
  userId: string,
  inhalt: string
): Promise<string> {
  const id = crypto.randomUUID();
  await db.batch([
    db
      .prepare(
        `INSERT INTO forum_posts (id, thread_id, user_id, inhalt)
         VALUES (?, ?, ?, ?)`
      )
      .bind(id, threadId, userId, inhalt),
    db.prepare(`UPDATE forum_threads SET updated_at = datetime('now') WHERE id = ?`).bind(threadId),
  ]);
  return id;
}

export async function incrementViews(db: D1Database, threadId: string): Promise<void> {
  await db.prepare("UPDATE forum_threads SET views = views + 1 WHERE id = ?").bind(threadId).run();
}

export async function deleteThread(
  db: D1Database,
  threadId: string,
  userId: string
): Promise<boolean> {
  // Delete posts first, then thread — only if user owns the thread
  const thread = await db
    .prepare("SELECT id FROM forum_threads WHERE id = ? AND user_id = ?")
    .bind(threadId, userId)
    .first<{ id: string }>();

  if (!thread) return false;

  await db.batch([
    db.prepare("DELETE FROM forum_posts WHERE thread_id = ?").bind(threadId),
    db.prepare("DELETE FROM forum_threads WHERE id = ?").bind(threadId),
  ]);
  return true;
}

export async function deletePost(db: D1Database, postId: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM forum_posts WHERE id = ? AND user_id = ?")
    .bind(postId, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

// ============================================
// Stats
// ============================================

export async function getStats(
  db: D1Database
): Promise<{ threads: number; antworten: number; mitglieder: number }> {
  const [threadCount, postCount, memberCount] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM forum_threads").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM forum_posts").first<{ c: number }>(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT user_id) as c FROM (
           SELECT user_id FROM forum_threads
           UNION
           SELECT user_id FROM forum_posts
         )`
      )
      .first<{ c: number }>(),
  ]);

  return {
    threads: threadCount?.c ?? 0,
    antworten: postCount?.c ?? 0,
    mitglieder: memberCount?.c ?? 0,
  };
}
