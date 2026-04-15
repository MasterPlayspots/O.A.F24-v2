import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables, FoerderprogrammRow } from "../../types";

export const katalog = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const katalogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  limit: z.coerce.number().min(1).max(50).optional(), // backward compat
  foerderart: z.string().optional(),
  foerderbereich: z.string().optional(),
  foerdergebiet: z.string().optional(),
  foerderberechtigte: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["titel", "foerderart", "foerdergebiet"]).default("titel"),
});

katalog.get("/katalog", async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams);
  const parsed = katalogQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Ungültige Parameter", details: parsed.error.issues },
      400
    );
  }

  const {
    page,
    pageSize: ps,
    limit: legacyLimit,
    foerderart,
    foerderbereich,
    foerdergebiet,
    foerderberechtigte,
    search,
    sort,
  } = parsed.data;
  const limit = legacyLimit ?? ps;
  const offset = (page - 1) * limit;
  const foerderDb = c.env.FOERDER_DB;

  // Build dynamic WHERE clauses — only show active programs by default
  const conditions: string[] = ["status != 'abgelaufen'"];
  const params: (string | number)[] = [];

  if (foerderart) {
    conditions.push("foerderart = ?");
    params.push(foerderart);
  }
  if (foerderbereich) {
    conditions.push("foerderbereich LIKE ?");
    params.push(`%${foerderbereich}%`);
  }
  if (foerdergebiet) {
    conditions.push("foerdergebiet LIKE ?");
    params.push(`%${foerdergebiet}%`);
  }
  if (foerderberechtigte) {
    conditions.push("foerderberechtigte LIKE ?");
    params.push(`%${foerderberechtigte}%`);
  }
  if (search) {
    conditions.push("(titel LIKE ? OR kurztext LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM foerderprogramme ${whereClause}`;
  const countResult = await foerderDb
    .prepare(countSql)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Fetch page
  const pageSize = limit;
  const dataSql = `SELECT id, titel, typ, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext
    FROM foerderprogramme ${whereClause}
    ORDER BY ${sort} ASC
    LIMIT ? OFFSET ?`;
  const dataResult = await foerderDb
    .prepare(dataSql)
    .bind(...params, pageSize, offset)
    .all<FoerderprogrammRow>();

  return c.json({
    success: true,
    data: dataResult.results ?? [],
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// MUST be before /katalog/:id to avoid the param catching "filters".
katalog.get("/katalog/filters", async (c) => {
  const foerderDb = c.env.FOERDER_DB;

  const [artResult, bereichResult, gebietResult, berechtigteResult] = await foerderDb.batch([
    foerderDb.prepare(
      "SELECT DISTINCT foerderart FROM foerderprogramme WHERE foerderart IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderart"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerderbereich FROM foerderprogramme WHERE foerderbereich IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderbereich"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerdergebiet FROM foerderprogramme WHERE foerdergebiet IS NOT NULL AND status != 'abgelaufen' ORDER BY foerdergebiet"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerderberechtigte FROM foerderprogramme WHERE foerderberechtigte IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderberechtigte"
    ),
  ]);

  return c.json({
    success: true,
    data: {
      foerderart: ((artResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderart
      ),
      foerderbereich: ((bereichResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderbereich
      ),
      foerdergebiet: ((gebietResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerdergebiet
      ),
      foerderberechtigte: ((berechtigteResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderberechtigte
      ),
    },
  });
});

katalog.get("/katalog/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);

  const foerderDb = c.env.FOERDER_DB;
  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(id)
    .first<FoerderprogrammRow>();

  if (!program) return c.json({ success: false, error: "Programm nicht gefunden" }, 404);

  return c.json({ success: true, data: program });
});
