// Antraege Routes — Detail + Dokumente + Zugriff (ACL)
//
// foerdermittel_cases (BAFA_DB) is the underlying table; this router exposes
// it under /api/antraege/* with the shape the Fund24 frontend expects.
//
// Authorization model:
//   - Owner   = user that owns foerdermittel_profile linked to the case
//   - Granted = entry in antrag_zugriff (any rolle)
//   - Mutations on /zugriff require owner role
//
// Documents live in foerdermittel_dokumente; binary data in R2 (REPORTS bucket)
// under prefix `dokumente/{caseId}/{uuid}-{filename}`.
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { sendAntragStatusChangedEmail } from "../services/email";

const antraege = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ---------- shared helpers ----------

interface CaseRow {
  id: string;
  profile_id: string;
  programm_id: number;
  berater_id: string | null;
  phase: string;
  status: string;
  phase_data: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  company_name: string;
}

type FrontendStatus = "entwurf" | "eingereicht" | "bewilligt" | "abgelehnt";

function deriveStatus(phase: string, status: string): FrontendStatus {
  if (status === "rejected") return "abgelehnt";
  if (status === "completed") {
    return phase === "follow_up" || phase === "submission" ? "bewilligt" : "abgelehnt";
  }
  if (phase === "submission" || phase === "follow_up") return "eingereicht";
  return "entwurf";
}

async function loadCaseWithOwner(
  db: D1Database,
  caseId: string
): Promise<{ row: CaseRow; owner: ProfileRow } | null> {
  const row = await db
    .prepare("SELECT * FROM foerdermittel_cases WHERE id = ?")
    .bind(caseId)
    .first<CaseRow>();
  if (!row) return null;
  const owner = await db
    .prepare("SELECT id, user_id, company_name FROM foerdermittel_profile WHERE id = ?")
    .bind(row.profile_id)
    .first<ProfileRow>();
  if (!owner) return null;
  return { row, owner };
}

async function userHasAccess(
  db: D1Database,
  caseId: string,
  userId: string,
  ownerUserId: string
): Promise<boolean> {
  if (userId === ownerUserId) return true;
  const acl = await db
    .prepare(
      `SELECT 1 FROM antrag_zugriff
         WHERE antrag_id = ? AND user_id = ?
         LIMIT 1`
    )
    .bind(caseId, userId)
    .first<{ "1": number }>();
  return !!acl;
}

// ============================================================
// GET /api/antraege/:id — Detail
// ============================================================

antraege.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);

  const allowed = await userHasAccess(c.env.BAFA_DB, id, user.id, ctx.owner.user_id);
  if (!allowed) return c.json({ success: false, error: "Keine Berechtigung" }, 403);

  // Optional programm name from FOERDER_DB
  let programm_name: string | null = null;
  try {
    const p = await c.env.FOERDER_DB
      .prepare("SELECT titel FROM foerderprogramme WHERE id = ?")
      .bind(ctx.row.programm_id)
      .first<{ titel: string }>();
    programm_name = p?.titel ?? null;
  } catch {
    // FOERDER_DB lookup is best-effort
  }

  // Vollstaendigkeit derived from case_steps if available
  let vollstaendigkeit: number | null = null;
  try {
    const s = await c.env.BAFA_DB
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done,
           COUNT(*) AS total
         FROM foerdermittel_case_steps WHERE case_id = ?`
      )
      .bind(id)
      .first<{ done: number; total: number }>();
    if (s && s.total > 0) {
      vollstaendigkeit = Math.round((Number(s.done) / Number(s.total)) * 100);
    }
  } catch {
    // case_steps optional
  }

  // Optional foerdersummen from phase_data JSON blob
  let beantragt: number | null = null;
  let bewilligt: number | null = null;
  if (ctx.row.phase_data) {
    try {
      const pd = JSON.parse(ctx.row.phase_data) as {
        foerdersumme_beantragt?: number;
        foerdersumme_bewilligt?: number;
      };
      beantragt = pd.foerdersumme_beantragt ?? null;
      bewilligt = pd.foerdersumme_bewilligt ?? null;
    } catch {
      // ignore malformed JSON
    }
  }

  return c.json({
    success: true,
    id: ctx.row.id,
    user_id: ctx.owner.user_id,
    programm_id: String(ctx.row.programm_id),
    programm_name,
    status: deriveStatus(ctx.row.phase, ctx.row.status),
    foerdersumme_beantragt: beantragt,
    foerdersumme_bewilligt: bewilligt,
    vollstaendigkeit,
    created_at: ctx.row.created_at,
    updated_at: ctx.row.updated_at,
  });
});

// ============================================================
// PATCH /api/antraege/:id — status transitions (owner-only)
// Maps the user-facing status (entwurf|eingereicht|bewilligt|abgelehnt)
// to the underlying foerdermittel_cases (phase, status) pair so the
// deriveStatus() read-path returns the same label.
// ============================================================

type FrontendWriteStatus = "entwurf" | "eingereicht" | "bewilligt" | "abgelehnt";

const patchSchema = z.object({
  status: z.enum(["entwurf", "eingereicht", "bewilligt", "abgelehnt"]),
  foerdersumme_beantragt: z.number().min(0).optional(),
  foerdersumme_bewilligt: z.number().min(0).optional(),
});

function writeStatusToDbPair(status: FrontendWriteStatus): { phase: string; status: string } {
  switch (status) {
    case "eingereicht":
      return { phase: "submission", status: "active" };
    case "bewilligt":
      return { phase: "follow_up", status: "completed" };
    case "abgelehnt":
      return { phase: "submission", status: "rejected" };
    case "entwurf":
    default:
      return { phase: "application_draft", status: "active" };
  }
}

antraege.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (user.id !== ctx.owner.user_id)
    return c.json({ success: false, error: "Nur Antrag-Owner darf den Status ändern" }, 403);

  const parsed = patchSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const body = parsed.data;
  const before = deriveStatus(ctx.row.phase, ctx.row.status);
  const dbPair = writeStatusToDbPair(body.status);

  // Patch phase_data blob with any new Fördersummen values.
  let phaseData: Record<string, unknown> = {};
  if (ctx.row.phase_data) {
    try {
      phaseData = JSON.parse(ctx.row.phase_data) as Record<string, unknown>;
    } catch {
      phaseData = {};
    }
  }
  if (body.foerdersumme_beantragt !== undefined) {
    phaseData.foerdersumme_beantragt = body.foerdersumme_beantragt;
  }
  if (body.foerdersumme_bewilligt !== undefined) {
    phaseData.foerdersumme_bewilligt = body.foerdersumme_bewilligt;
  }

  await c.env.BAFA_DB
    .prepare(
      `UPDATE foerdermittel_cases
          SET phase = ?, status = ?, phase_data = ?, updated_at = datetime('now')
        WHERE id = ?`
    )
    .bind(dbPair.phase, dbPair.status, JSON.stringify(phaseData), id)
    .run();

  // Fire email only on real transitions to a notifiable status.
  if (
    c.env.RESEND_API_KEY &&
    body.status !== before &&
    (body.status === "eingereicht" || body.status === "bewilligt" || body.status === "abgelehnt")
  ) {
    const ownerContact = await c.env.DB
      .prepare("SELECT email, first_name AS firstName FROM users WHERE id = ?")
      .bind(ctx.owner.user_id)
      .first<{ email: string; firstName: string }>();
    const programm = await c.env.FOERDER_DB
      .prepare("SELECT titel FROM foerderprogramme WHERE id = ?")
      .bind(ctx.row.programm_id)
      .first<{ titel: string }>()
      .catch(() => null);
    if (ownerContact?.email) {
      c.executionCtx.waitUntil(
        sendAntragStatusChangedEmail(
          c.env.RESEND_API_KEY,
          ownerContact.email,
          ownerContact.firstName || "",
          programm?.titel || "dein Programm",
          body.status,
          id
        )
      );
    }
  }

  return c.json({ success: true, status: body.status });
});

// ============================================================
// /:id/dokumente — list, upload, delete
// ============================================================

interface DokumentRow {
  id: string;
  dateiname: string;
  dateigroesse: number;
  dateityp: string;
  uploaded_at: string;
}

antraege.get("/:id/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (!(await userHasAccess(c.env.BAFA_DB, id, user.id, ctx.owner.user_id)))
    return c.json({ success: false, error: "Keine Berechtigung" }, 403);

  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT id, dateiname, dateigroesse, dateityp, uploaded_at
         FROM foerdermittel_dokumente
         WHERE case_id = ?
         ORDER BY uploaded_at DESC`
    )
    .bind(id)
    .all<DokumentRow>();

  return c.json({
    success: true,
    data: (result.results ?? []).map((d) => ({
      id: d.id,
      filename: d.dateiname,
      size_bytes: d.dateigroesse,
      mime_type: d.dateityp,
      uploaded_at: d.uploaded_at,
    })),
  });
});

// Multipart upload: form-data with `file` (binary) + optional `dokument_typ`
antraege.post("/:id/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (!(await userHasAccess(c.env.BAFA_DB, id, user.id, ctx.owner.user_id)))
    return c.json({ success: false, error: "Keine Berechtigung" }, 403);

  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ success: false, error: "Datei fehlt (form-data 'file')" }, 400);
  }
  if (file.size > 25 * 1024 * 1024) {
    return c.json({ success: false, error: "Datei zu gross (max 25 MB)" }, 413);
  }

  const dokumentTyp = (form.get("dokument_typ") as string | null) || "sonstiges";
  const dokId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const r2Key = `dokumente/${id}/${dokId}-${safeName}`;

  await c.env.REPORTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  await c.env.BAFA_DB
    .prepare(
      `INSERT INTO foerdermittel_dokumente
         (id, case_id, dokument_typ, dateiname, dateityp, dateigroesse, r2_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(dokId, id, dokumentTyp, file.name, file.type || "application/octet-stream", file.size, r2Key)
    .run();

  return c.json(
    {
      success: true,
      data: {
        id: dokId,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type || "application/octet-stream",
        uploaded_at: new Date().toISOString(),
      },
    },
    201
  );
});

antraege.delete("/:id/dokumente/:dokId", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const dokId = c.req.param("dokId");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  // Only owner can delete docs
  if (user.id !== ctx.owner.user_id)
    return c.json({ success: false, error: "Nur Antrag-Owner darf loeschen" }, 403);

  const dok = await c.env.BAFA_DB
    .prepare("SELECT r2_key FROM foerdermittel_dokumente WHERE id = ? AND case_id = ?")
    .bind(dokId, id)
    .first<{ r2_key: string }>();
  if (!dok) return c.json({ success: false, error: "Dokument nicht gefunden" }, 404);

  await c.env.REPORTS.delete(dok.r2_key);
  await c.env.BAFA_DB
    .prepare("DELETE FROM foerdermittel_dokumente WHERE id = ?")
    .bind(dokId)
    .run();

  return c.json({ success: true });
});

// ============================================================
// /:id/zugriff — list, grant, revoke ACL
// ============================================================

const grantSchema = z.object({
  user_id: z.string().min(1).optional(),
  berater_id: z.string().min(1).optional(),
  rolle: z.enum(["editor", "viewer", "reviewer"]),
}).refine((d) => !!d.user_id || !!d.berater_id, {
  message: "Entweder user_id oder berater_id ist erforderlich",
});

interface ZugriffRow {
  id: string;
  user_id: string | null;
  berater_id: string | null;
  rolle: string;
  granted_by: string;
  granted_at: string;
}

antraege.get("/:id/zugriff", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (!(await userHasAccess(c.env.BAFA_DB, id, user.id, ctx.owner.user_id)))
    return c.json({ success: false, error: "Keine Berechtigung" }, 403);

  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT id, user_id, berater_id, rolle, granted_by, granted_at
         FROM antrag_zugriff
         WHERE antrag_id = ? AND rolle != 'owner'
         ORDER BY granted_at DESC`
    )
    .bind(id)
    .all<ZugriffRow>();

  // Best-effort enrich with berater display_name (cross-DB join not possible)
  const data = await Promise.all(
    (result.results ?? []).map(async (r) => {
      let display_name: string | null = null;
      if (r.berater_id) {
        const b = await c.env.BAFA_DB
          .prepare("SELECT display_name FROM berater_profiles WHERE id = ?")
          .bind(r.berater_id)
          .first<{ display_name: string }>();
        display_name = b?.display_name ?? null;
      }
      return {
        id: r.id,
        user_id: r.user_id,
        berater_id: r.berater_id,
        rolle: r.rolle,
        granted_by: r.granted_by,
        created_at: r.granted_at,
        first_name: display_name,
        last_name: null,
        user_email: null,
      };
    })
  );

  return c.json({ success: true, data });
});

antraege.post("/:id/zugriff", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (user.id !== ctx.owner.user_id)
    return c.json({ success: false, error: "Nur Antrag-Owner darf einladen" }, 403);

  const parsed = grantSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const d = parsed.data;

  // If berater_id is given, verify it exists
  if (d.berater_id) {
    const b = await c.env.BAFA_DB
      .prepare("SELECT id FROM berater_profiles WHERE id = ?")
      .bind(d.berater_id)
      .first<{ id: string }>();
    if (!b) return c.json({ success: false, error: "Berater nicht gefunden" }, 404);
  }

  // Idempotency: avoid duplicate active grants for the same target
  const dupe = await c.env.BAFA_DB
    .prepare(
      `SELECT id FROM antrag_zugriff
         WHERE antrag_id = ?
           AND rolle = ?
           AND ((user_id IS NOT NULL AND user_id = ?) OR (berater_id IS NOT NULL AND berater_id = ?))`
    )
    .bind(id, d.rolle, d.user_id ?? null, d.berater_id ?? null)
    .first<{ id: string }>();
  if (dupe) return c.json({ success: true, id: dupe.id, duplicate: true });

  const insert = await c.env.BAFA_DB
    .prepare(
      `INSERT INTO antrag_zugriff
         (antrag_id, user_id, berater_id, rolle, granted_by)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`
    )
    .bind(id, d.user_id ?? null, d.berater_id ?? null, d.rolle, user.id)
    .first<{ id: string }>();

  return c.json({ success: true, id: insert?.id ?? null }, 201);
});

antraege.delete("/:id/zugriff/:zugriffId", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const zugriffId = c.req.param("zugriffId");

  const ctx = await loadCaseWithOwner(c.env.BAFA_DB, id);
  if (!ctx) return c.json({ success: false, error: "Antrag nicht gefunden" }, 404);
  if (user.id !== ctx.owner.user_id)
    return c.json({ success: false, error: "Nur Antrag-Owner darf entziehen" }, 403);

  const res = await c.env.BAFA_DB
    .prepare("DELETE FROM antrag_zugriff WHERE id = ? AND antrag_id = ? AND rolle != 'owner'")
    .bind(zugriffId, id)
    .run();
  if (!res.meta.changes)
    return c.json({ success: false, error: "Zugriff nicht gefunden" }, 404);
  return c.json({ success: true });
});

export { antraege };
