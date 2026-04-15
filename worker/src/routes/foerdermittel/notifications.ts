import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const notifications = new Hono<{ Bindings: Bindings; Variables: Variables }>();

notifications.get("/notifications", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;

  const list = await bafaDb
    .prepare(
      `SELECT * FROM foerdermittel_benachrichtigungen
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all();

  const unreadCount = await bafaDb
    .prepare(
      "SELECT COUNT(*) as count FROM foerdermittel_benachrichtigungen WHERE user_id = ? AND gelesen = 0"
    )
    .bind(user.id)
    .first<{ count: number }>();

  return c.json({
    success: true,
    data: {
      notifications: list.results ?? [],
      unread_count: unreadCount?.count ?? 0,
    },
  });
});

notifications.patch("/notifications/:id/read", requireAuth, async (c) => {
  const user = c.get("user");
  const notifId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;

  await bafaDb
    .prepare("UPDATE foerdermittel_benachrichtigungen SET gelesen = 1 WHERE id = ? AND user_id = ?")
    .bind(notifId, user.id)
    .run();

  return c.json({ success: true });
});

// GET /program-documents/:programId — required documents for a program.
// Grouped here with notifications since both are small, user-scoped,
// read-oriented concerns not tied to a case.
notifications.get("/program-documents/:programId", requireAuth, async (c) => {
  const { programId } = c.req.param();
  const foerderDb = c.env.FOERDER_DB;

  const { results } = await foerderDb
    .prepare(
      "SELECT * FROM program_documents WHERE program_id = ? OR program_id = '*' ORDER BY required DESC, document_name ASC"
    )
    .bind(programId)
    .all();

  return c.json({ documents: results || [] });
});
