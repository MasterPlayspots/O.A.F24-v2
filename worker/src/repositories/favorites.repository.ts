// Favorites Repository — canonical data-access for the `favorites` table.
//
// Single source of truth across the platform. Two legacy tables
// (bafa_antraege.foerdermittel_favoriten, bafa_antraege.me_favoriten) were
// renamed to _deprecated_* in migration 031 and have no readers/writers.
// All favorite CRUD goes through this module; the sub-app lives at
// worker/src/routes/foerdermittel/favoriten.ts and binds FOERDER_DB.

export interface FavoriteWithProgram {
  id: string;
  user_id: string;
  program_id: number;
  created_at: string;
  titel: string | null;
  foerderart: string | null;
  foerderbereich: string | null;
  foerdergebiet: string | null;
  foerderberechtigte: string | null;
  kurztext: string | null;
}

// ============================================
// Reads
// ============================================

export async function listByUser(db: D1Database, userId: string): Promise<FavoriteWithProgram[]> {
  const result = await db
    .prepare(
      `SELECT f.id, f.user_id, f.program_id, f.created_at,
              p.titel, p.foerderart, p.foerderbereich, p.foerdergebiet,
              p.foerderberechtigte, p.kurztext
       FROM favorites f
       JOIN foerderprogramme p ON p.id = f.program_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .bind(userId)
    .all<FavoriteWithProgram>();

  return result.results ?? [];
}

export async function isFavorite(
  db: D1Database,
  userId: string,
  programId: number
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM favorites WHERE user_id = ? AND program_id = ?")
    .bind(userId, programId)
    .first<{ id: string }>();

  return !!row;
}

// ============================================
// Writes
// ============================================

export async function add(db: D1Database, userId: string, programId: number): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT OR IGNORE INTO favorites (id, user_id, program_id) VALUES (?, ?, ?)")
    .bind(id, userId, programId)
    .run();

  return id;
}

export async function remove(db: D1Database, userId: string, programId: number): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM favorites WHERE user_id = ? AND program_id = ?")
    .bind(userId, programId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
