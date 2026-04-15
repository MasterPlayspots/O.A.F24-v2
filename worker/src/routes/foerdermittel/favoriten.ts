import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import * as FavoritesRepo from "../../repositories/favorites.repository";
import { requireAuth } from "../../middleware/auth";

export const favoriten = new Hono<{ Bindings: Bindings; Variables: Variables }>();

favoriten.get("/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;

  const favorites = await FavoritesRepo.listByUser(foerderDb, user.id);

  return c.json({ success: true, data: favorites });
});

favoriten.post("/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const body = await c.req.json();

  const programId = Number(body.programId);
  if (!programId || isNaN(programId)) {
    return c.json({ success: false, error: "programId erforderlich" }, 400);
  }

  // Verify program exists
  const program = await foerderDb
    .prepare("SELECT id FROM foerderprogramme WHERE id = ?")
    .bind(programId)
    .first<{ id: number }>();

  if (!program) {
    return c.json({ success: false, error: "Programm nicht gefunden" }, 404);
  }

  const id = await FavoritesRepo.add(foerderDb, user.id, programId);

  return c.json({ success: true, data: { id } }, 201);
});

favoriten.delete("/favorites/:programId", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const programId = parseInt(c.req.param("programId"), 10);

  if (isNaN(programId)) {
    return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);
  }

  const removed = await FavoritesRepo.remove(foerderDb, user.id, programId);

  if (!removed) {
    return c.json({ success: false, error: "Favorit nicht gefunden" }, 404);
  }

  return c.json({ success: true });
});

favoriten.get("/favorites/:programId/check", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const programId = parseInt(c.req.param("programId"), 10);

  if (isNaN(programId)) {
    return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);
  }

  const isFav = await FavoritesRepo.isFavorite(foerderDb, user.id, programId);

  return c.json({ success: true, data: { isFavorite: isFav } });
});
