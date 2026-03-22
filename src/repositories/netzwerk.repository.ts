// Netzwerk & Berater Repository - Data access layer for berater_profile and netzwerk_anfragen

export interface BeraterProfileRow {
  id: string;
  user_id: string;
  spezialisierung: string | null;
  regionen: string | null;
  bio: string | null;
  erfahrung_jahre: number;
  erfolgsquote: number;
  bewertung: number;
  anzahl_bewertungen: number;
  verfuegbar: number;
  created_at: string;
}

export interface BeraterWithUser extends BeraterProfileRow {
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
}

export interface AnfrageRow {
  id: string;
  von_user_id: string;
  an_user_id: string;
  nachricht: string | null;
  status: string;
  created_at: string;
}

export interface AnfrageWithUser extends AnfrageRow {
  von_first_name: string;
  von_last_name: string;
  von_company: string | null;
  an_first_name: string;
  an_last_name: string;
  an_company: string | null;
}

export interface ListBeraterOptions {
  spezialisierung?: string;
  region?: string;
  page?: number;
  pageSize?: number;
}

// ============================================
// Berater Profile
// ============================================

export async function listBerater(
  db: D1Database,
  options: ListBeraterOptions = {}
): Promise<{ berater: BeraterWithUser[]; total: number }> {
  const { spezialisierung, region, page = 1, pageSize = 20 } = options;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["bp.verfuegbar = 1"];
  const binds: (string | number)[] = [];

  if (spezialisierung) {
    conditions.push("bp.spezialisierung LIKE ?");
    binds.push(`%${spezialisierung}%`);
  }
  if (region) {
    conditions.push("bp.regionen LIKE ?");
    binds.push(`%${region}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM berater_profile bp ${where}`)
    .bind(...binds)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const query = `
    SELECT bp.*, u.first_name, u.last_name, u.email, u.company
    FROM berater_profile bp
    JOIN users u ON u.id = bp.user_id
    ${where}
    ORDER BY bp.bewertung DESC, bp.anzahl_bewertungen DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db
    .prepare(query)
    .bind(...binds, pageSize, offset)
    .all<BeraterWithUser>();

  return { berater: result.results || [], total };
}

export async function getBeraterProfile(
  db: D1Database,
  userId: string
): Promise<BeraterWithUser | null> {
  return db
    .prepare(
      `SELECT bp.*, u.first_name, u.last_name, u.email, u.company
       FROM berater_profile bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.user_id = ?`
    )
    .bind(userId)
    .first<BeraterWithUser>();
}

export async function getBeraterProfileById(
  db: D1Database,
  profileId: string
): Promise<BeraterWithUser | null> {
  return db
    .prepare(
      `SELECT bp.*, u.first_name, u.last_name, u.email, u.company
       FROM berater_profile bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.id = ?`
    )
    .bind(profileId)
    .first<BeraterWithUser>();
}

export async function createOrUpdateProfile(
  db: D1Database,
  userId: string,
  data: {
    spezialisierung?: string;
    regionen?: string;
    bio?: string;
    erfahrung_jahre?: number;
    verfuegbar?: boolean;
  }
): Promise<BeraterProfileRow> {
  const existing = await db
    .prepare("SELECT id FROM berater_profile WHERE user_id = ?")
    .bind(userId)
    .first<{ id: string }>();

  if (existing) {
    // Update
    const sets: string[] = [];
    const binds: (string | number)[] = [];

    if (data.spezialisierung !== undefined) {
      sets.push("spezialisierung = ?");
      binds.push(data.spezialisierung);
    }
    if (data.regionen !== undefined) {
      sets.push("regionen = ?");
      binds.push(data.regionen);
    }
    if (data.bio !== undefined) {
      sets.push("bio = ?");
      binds.push(data.bio);
    }
    if (data.erfahrung_jahre !== undefined) {
      sets.push("erfahrung_jahre = ?");
      binds.push(data.erfahrung_jahre);
    }
    if (data.verfuegbar !== undefined) {
      sets.push("verfuegbar = ?");
      binds.push(data.verfuegbar ? 1 : 0);
    }

    if (sets.length > 0) {
      await db
        .prepare(`UPDATE berater_profile SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...binds, existing.id)
        .run();
    }

    return (await db
      .prepare("SELECT * FROM berater_profile WHERE id = ?")
      .bind(existing.id)
      .first<BeraterProfileRow>())!;
  } else {
    // Create
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO berater_profile (id, user_id, spezialisierung, regionen, bio, erfahrung_jahre, verfuegbar)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        data.spezialisierung ?? null,
        data.regionen ?? null,
        data.bio ?? null,
        data.erfahrung_jahre ?? 0,
        data.verfuegbar !== undefined ? (data.verfuegbar ? 1 : 0) : 1
      )
      .run();

    return (await db
      .prepare("SELECT * FROM berater_profile WHERE id = ?")
      .bind(id)
      .first<BeraterProfileRow>())!;
  }
}

// ============================================
// Netzwerk Anfragen
// ============================================

export async function listAnfragen(db: D1Database, userId: string): Promise<AnfrageWithUser[]> {
  const result = await db
    .prepare(
      `SELECT na.*,
              v.first_name as von_first_name, v.last_name as von_last_name, v.company as von_company,
              a.first_name as an_first_name, a.last_name as an_last_name, a.company as an_company
       FROM netzwerk_anfragen na
       JOIN users v ON v.id = na.von_user_id
       JOIN users a ON a.id = na.an_user_id
       WHERE na.an_user_id = ? OR na.von_user_id = ?
       ORDER BY na.created_at DESC`
    )
    .bind(userId, userId)
    .all<AnfrageWithUser>();

  return result.results || [];
}

export async function createAnfrage(
  db: D1Database,
  vonUserId: string,
  anUserId: string,
  nachricht: string | null
): Promise<AnfrageRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO netzwerk_anfragen (id, von_user_id, an_user_id, nachricht)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, vonUserId, anUserId, nachricht)
    .run();

  return (await db
    .prepare("SELECT * FROM netzwerk_anfragen WHERE id = ?")
    .bind(id)
    .first<AnfrageRow>())!;
}

export async function updateAnfrageStatus(
  db: D1Database,
  anfrageId: string,
  userId: string,
  status: "angenommen" | "abgelehnt"
): Promise<AnfrageRow | null> {
  // Only the recipient can accept/reject
  const anfrage = await db
    .prepare("SELECT * FROM netzwerk_anfragen WHERE id = ? AND an_user_id = ?")
    .bind(anfrageId, userId)
    .first<AnfrageRow>();

  if (!anfrage) return null;

  await db
    .prepare("UPDATE netzwerk_anfragen SET status = ? WHERE id = ?")
    .bind(status, anfrageId)
    .run();

  return { ...anfrage, status };
}
