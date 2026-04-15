import { Hono } from "hono";
import { z } from "zod";
import type {
  Bindings,
  Variables,
  FoerderprogrammRow,
  FoerdermittelProfileRow,
  FoerdermittelMatchRow,
  FoerdermittelCaseRow,
  FoerdermittelCaseStepRow,
  FoerdermittelFunnelTemplateRow,
  FoerdermittelDokumentRow,
  FoerdermittelConversationRow,
} from "../../types";
import { requireAuth } from "../../middleware/auth";
import { favoriten } from "./favoriten";
import { katalog } from "./katalog";
import { match } from "./match";

const foerdermittel = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Sub-routers extracted (F-008).
foerdermittel.route("/", favoriten);
foerdermittel.route("/", katalog);
foerdermittel.route("/", match);

// ============================================
// Cases: Workflow engine
// ============================================

foerdermittel.post("/cases", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const rawBody = (await c.req.json()) as { match_id?: string; programm_id: number | string };
  if (!rawBody.programm_id && rawBody.programm_id !== 0)
    return c.json({ success: false, error: "programm_id erforderlich" }, 400);
  // Type-coerce: frontend may send a string id; foerderprogramme.id is INTEGER.
  const coercedProgrammId =
    typeof rawBody.programm_id === "number"
      ? rawBody.programm_id
      : Number(rawBody.programm_id);
  if (Number.isNaN(coercedProgrammId)) {
    return c.json({ success: false, error: "programm_id ungültig" }, 400);
  }
  const body = { ...rawBody, programm_id: coercedProgrammId };

  // Sprint 19: always read fresh from bafa_antraege.unternehmen and
  // upsert foerdermittel_profile so subsequent updates to the company
  // profile sync through to the funnel generator. Replaces the
  // Sprint-14 one-shot mirror that froze data on first antrag.
  const u = await bafaDb
    .prepare("SELECT * FROM unternehmen WHERE user_id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(user.id)
    .first<{
      firmenname: string;
      branche: string | null;
      ort: string | null;
      bundesland: string | null;
      rechtsform: string | null;
      mitarbeiter_anzahl: number | null;
      jahresumsatz: number | null;
      gruendungsjahr: number | null;
    }>();
  if (!u) {
    return c.json(
      { success: false, error: "Bitte zuerst Unternehmensprofil unter /onboarding/unternehmen anlegen" },
      400
    );
  }
  const standort = [u.ort, u.bundesland].filter(Boolean).join(", ") || null;
  const existing = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (existing) {
    await bafaDb
      .prepare(
        `UPDATE foerdermittel_profile SET
            company_name = ?, branche = ?, standort = ?, rechtsform = ?,
            mitarbeiter_anzahl = ?, jahresumsatz = ?, gruendungsjahr = ?,
            updated_at = datetime('now')
          WHERE id = ?`
      )
      .bind(
        u.firmenname,
        u.branche,
        standort,
        u.rechtsform,
        u.mitarbeiter_anzahl,
        u.jahresumsatz,
        u.gruendungsjahr,
        existing.id
      )
      .run();
  } else {
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_profile
          (id, user_id, company_name, branche, standort, rechtsform,
           mitarbeiter_anzahl, jahresumsatz, gruendungsjahr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        u.firmenname,
        u.branche,
        standort,
        u.rechtsform,
        u.mitarbeiter_anzahl,
        u.jahresumsatz,
        u.gruendungsjahr
      )
      .run();
  }
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil-Sync fehlgeschlagen" }, 500);

  // Get program details for funnel generation
  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(body.programm_id)
    .first<FoerderprogrammRow>();
  if (!program) return c.json({ success: false, error: "Programm nicht gefunden" }, 404);

  // Check for existing funnel template or generate one
  let template = await bafaDb
    .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE programm_id = ?")
    .bind(body.programm_id)
    .first<FoerdermittelFunnelTemplateRow>();

  if (!template) {
    // Generate funnel template via AI
    const funnelPrompt = `Du bist ein Experte für deutsche Fördermittelanträge. Erstelle einen strukturierten Antragsprozess für folgendes Förderprogramm:

PROGRAMM: ${program.titel}
ART: ${program.foerderart}
VORAUSSETZUNGEN: ${program.rechtliche_voraussetzungen || "Keine angegeben"}
VOLLTEXT: ${(program.volltext || "").slice(0, 2000)}

Erstelle ein JSON mit Phasen und Schritten. Jede Phase hat steps mit Typ:
- document_upload: Dokument hochladen
- form_fill: Formular ausfüllen
- ai_review: KI-Prüfung
- consultant_action: Berater-Aktion
- approval: Genehmigung

Format:
{
  "phases": [
    {
      "id": "eligibility_check",
      "title": "Eignungsprüfung",
      "steps": [
        {"title": "...", "description": "...", "type": "form_fill", "required": true}
      ]
    }
  ]
}

Verwende diese Phase-IDs: eligibility_check, document_collection, application_draft, review, submission, follow_up.
Antworte NUR mit dem JSON.`;

    try {
      const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [{ role: "user", content: funnelPrompt }],
        max_tokens: 3000,
      })) as { response?: string };

      let phasesJson = "[]";
      if (result.response) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          phasesJson = JSON.stringify(parsed.phases || []);
        }
      }

      const templateId = crypto.randomUUID();
      await bafaDb
        .prepare(
          `INSERT INTO foerdermittel_funnel_templates (id, programm_id, phases, generated_by)
         VALUES (?, ?, ?, ?)`
        )
        .bind(templateId, body.programm_id, phasesJson, "@cf/meta/llama-3.1-8b-instruct-fp8")
        .run();

      template = await bafaDb
        .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE id = ?")
        .bind(templateId)
        .first<FoerdermittelFunnelTemplateRow>();
    } catch {
      // Fallback: create with default phases
      const defaultPhases = JSON.stringify([
        {
          id: "eligibility_check",
          title: "Eignungsprüfung",
          steps: [
            {
              title: "Unternehmensform prüfen",
              description: "Prüfen Sie ob Ihre Unternehmensform berechtigt ist",
              type: "form_fill",
              required: true,
            },
            {
              title: "KI-Eignungsbewertung",
              description: "Automatische Prüfung der Grundvoraussetzungen",
              type: "ai_review",
              required: true,
            },
          ],
        },
        {
          id: "document_collection",
          title: "Dokumentensammlung",
          steps: [
            {
              title: "Handelsregisterauszug",
              description: "Aktueller Handelsregisterauszug hochladen",
              type: "document_upload",
              required: true,
            },
            {
              title: "Jahresabschluss",
              description: "Jahresabschluss der letzten 2 Jahre",
              type: "document_upload",
              required: true,
            },
          ],
        },
        {
          id: "application_draft",
          title: "Antragsentwurf",
          steps: [
            {
              title: "KI-Antragsgenerierung",
              description: "KI erstellt einen Antragsentwurf",
              type: "ai_review",
              required: true,
            },
            {
              title: "Berater-Review",
              description: "Ihr Berater prüft den Entwurf",
              type: "consultant_action",
              required: true,
            },
          ],
        },
        {
          id: "review",
          title: "Prüfung",
          steps: [
            {
              title: "Finale Prüfung",
              description: "Letzte Überprüfung aller Unterlagen",
              type: "consultant_action",
              required: true,
            },
            {
              title: "Freigabe",
              description: "Bestätigen Sie die Einreichung",
              type: "approval",
              required: true,
            },
          ],
        },
        {
          id: "submission",
          title: "Einreichung",
          steps: [
            {
              title: "Antragspaket erstellen",
              description: "Alle Unterlagen zusammenstellen",
              type: "ai_review",
              required: true,
            },
            {
              title: "Einreichung bestätigen",
              description: "Antrag als eingereicht markieren",
              type: "approval",
              required: true,
            },
          ],
        },
        {
          id: "follow_up",
          title: "Nachverfolgung",
          steps: [
            {
              title: "Bescheid abwarten",
              description: "Bearbeitungsstatus verfolgen",
              type: "form_fill",
              required: false,
            },
          ],
        },
      ]);

      const templateId = crypto.randomUUID();
      await bafaDb
        .prepare(
          `INSERT INTO foerdermittel_funnel_templates (id, programm_id, phases, generated_by)
         VALUES (?, ?, ?, 'fallback')`
        )
        .bind(templateId, body.programm_id, defaultPhases)
        .run();

      template = await bafaDb
        .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE id = ?")
        .bind(templateId)
        .first<FoerdermittelFunnelTemplateRow>();
    }
  }

  // Create the case
  const caseId = crypto.randomUUID();
  await bafaDb
    .prepare(
      `INSERT INTO foerdermittel_cases (id, match_id, profile_id, programm_id, phase, status)
     VALUES (?, ?, ?, ?, 'eligibility_check', 'active')`
    )
    .bind(caseId, body.match_id ?? null, profile.id, body.programm_id)
    .run();

  // Copy template steps into case_steps
  if (template) {
    const phases = JSON.parse(template.phases) as Array<{
      id: string;
      title: string;
      steps: Array<{ title: string; description: string; type: string; required: boolean }>;
    }>;

    let stepOrder = 0;
    for (const phase of phases) {
      for (const step of phase.steps || []) {
        stepOrder++;
        await bafaDb
          .prepare(
            `INSERT INTO foerdermittel_case_steps (id, case_id, phase, step_order, title, description, step_type, required, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
          )
          .bind(
            crypto.randomUUID(),
            caseId,
            phase.id,
            stepOrder,
            step.title,
            step.description,
            step.type,
            step.required ? 1 : 0
          )
          .run();
      }
    }
  }

  // Update match status if applicable
  if (body.match_id) {
    await bafaDb
      .prepare("UPDATE foerdermittel_matches SET status = 'started' WHERE id = ?")
      .bind(body.match_id)
      .run();
  }

  return c.json({ success: true, data: { caseId } }, 201);
});

// List user's cases
foerdermittel.get("/cases", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: true, data: { cases: [] } });

  const cases = await bafaDb
    .prepare(`SELECT * FROM foerdermittel_cases WHERE profile_id = ? ORDER BY created_at DESC`)
    .bind(profile.id)
    .all<FoerdermittelCaseRow>();

  // Enrich with program info and step counts
  const enriched = [];
  for (const cs of cases.results ?? []) {
    const program = await foerderDb
      .prepare("SELECT id, titel, foerderart FROM foerderprogramme WHERE id = ?")
      .bind(cs.programm_id)
      .first<FoerderprogrammRow>();

    const stepCounts = await bafaDb
      .prepare(
        `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM foerdermittel_case_steps WHERE case_id = ?`
      )
      .bind(cs.id)
      .first<{ total: number; completed: number }>();

    enriched.push({
      ...cs,
      programm: program || null,
      steps_total: stepCounts?.total ?? 0,
      steps_completed: stepCounts?.completed ?? 0,
    });
  }

  return c.json({ success: true, data: { cases: enriched } });
});

// Get single case with all steps
foerdermittel.get("/cases/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<FoerdermittelCaseRow>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const steps = await bafaDb
    .prepare("SELECT * FROM foerdermittel_case_steps WHERE case_id = ? ORDER BY step_order")
    .bind(caseId)
    .all<FoerdermittelCaseStepRow>();

  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(cs.programm_id)
    .first<FoerderprogrammRow>();

  return c.json({
    success: true,
    data: {
      ...cs,
      steps: steps.results ?? [],
      programm: program || null,
    },
  });
});

// Complete a step
foerdermittel.patch("/cases/:caseId/steps/:stepId", requireAuth, async (c) => {
  const user = c.get("user");
  const { caseId, stepId } = c.req.param();
  const bafaDb = c.env.BAFA_DB;
  const body = (await c.req.json()) as { status?: string; result_data?: Record<string, unknown> };

  // Verify ownership
  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id, phase FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string; phase: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const newStatus = body.status || "completed";
  const resultData = body.result_data ? JSON.stringify(body.result_data) : null;

  await bafaDb
    .prepare(
      `UPDATE foerdermittel_case_steps SET
      status = ?, result_data = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
    WHERE id = ? AND case_id = ?`
    )
    .bind(newStatus, resultData, newStatus, stepId, caseId)
    .run();

  // Check if all required steps in current phase are completed → advance phase
  const phaseSteps = await bafaDb
    .prepare(
      `SELECT required, status FROM foerdermittel_case_steps WHERE case_id = ? AND phase = ?`
    )
    .bind(caseId, cs.phase)
    .all<{ required: number; status: string }>();

  const allRequiredDone = (phaseSteps.results ?? []).every(
    (s) => s.required === 0 || s.status === "completed"
  );

  if (allRequiredDone) {
    const phaseOrder = [
      "eligibility_check",
      "document_collection",
      "application_draft",
      "review",
      "submission",
      "follow_up",
    ];
    const currentIdx = phaseOrder.indexOf(cs.phase);
    if (currentIdx < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIdx + 1];
      await bafaDb
        .prepare(
          "UPDATE foerdermittel_cases SET phase = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(nextPhase, caseId)
        .run();
    } else {
      // Final phase completed
      await bafaDb
        .prepare(
          "UPDATE foerdermittel_cases SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(caseId)
        .run();
    }
  }

  return c.json({ success: true });
});

// ============================================
// Cases Chat: Dedicated case-scoped chat endpoint
// ============================================

const caseChatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversation_id: z.string().optional(),
});

foerdermittel.post("/cases/:id/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const body = await c.req.json();
  const parsed = caseChatSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues },
      400
    );
  const { message, conversation_id } = parsed.data;

  // Get profile and verify ownership
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil erforderlich" }, 400);

  const cs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<FoerdermittelCaseRow>();
  if (!cs)
    return c.json({ success: false, error: "Fall nicht gefunden oder nicht autorisiert" }, 404);

  // Load or create conversation
  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

  // Build system context with case + program info
  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}`;

  // Always load case context for this endpoint
  const program = await foerderDb
    .prepare(
      "SELECT titel, volltext, rechtliche_voraussetzungen FROM foerderprogramme WHERE id = ?"
    )
    .bind(cs.programm_id)
    .first<FoerderprogrammRow>();

  if (program) {
    systemPrompt += `\n\nAKTUELLES FÖRDERPROGRAMM: ${program.titel}
PHASE: ${cs.phase}
VORAUSSETZUNGEN: ${(program.rechtliche_voraussetzungen || "").slice(0, 2000)}`;
  }

  // Load current steps for richer context
  const steps = await bafaDb
    .prepare(
      "SELECT title, phase, status FROM foerdermittel_case_steps WHERE case_id = ? ORDER BY step_order"
    )
    .bind(caseId)
    .all<{ title: string; phase: string; status: string }>();

  if (steps.results && steps.results.length > 0) {
    const stepsInfo = steps.results
      .map((s) => `- [${s.status}] ${s.title} (${s.phase})`)
      .join("\n");
    systemPrompt += `\n\nAKTUELLE SCHRITTE:\n${stepsInfo}`;
  }

  // Add user message
  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

  // Build AI messages (keep last 20 for context)
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: aiMessages,
    max_tokens: 1500,
  })) as { response?: string };

  const assistantMessage =
    result.response || "Entschuldigung, ich konnte keine Antwort generieren.";
  messages.push({
    role: "assistant",
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  // Save conversation
  if (conversation) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(JSON.stringify(messages), conversation.id)
      .run();
  } else {
    const convId = conversation_id || crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_conversations (id, case_id, profile_id, context, messages)
       VALUES (?, ?, ?, ?, ?)`
      )
      .bind(convId, caseId, profile.id, "funnel_guidance", JSON.stringify(messages))
      .run();
    conversation = { id: convId } as FoerdermittelConversationRow;
  }

  return c.json({
    success: true,
    data: {
      conversation_id: conversation!.id,
      message: assistantMessage,
    },
  });
});

// ============================================
// AI Chat: Conversation with funnel agent
// ============================================

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  case_id: z.string().optional(),
  context: z.enum(["matchmaking", "funnel_guidance", "document_help"]).default("funnel_guidance"),
  conversation_id: z.string().optional(),
});

foerdermittel.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const body = await c.req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues },
      400
    );
  const { message, case_id, context, conversation_id } = parsed.data;

  // Get profile
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil erforderlich" }, 400);

  // Load or create conversation
  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

  // Build system context
  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}`;

  // Add case context if available
  if (case_id) {
    const cs = await bafaDb
      .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
      .bind(case_id, profile.id)
      .first<FoerdermittelCaseRow>();

    if (cs) {
      const program = await foerderDb
        .prepare(
          "SELECT titel, volltext, rechtliche_voraussetzungen FROM foerderprogramme WHERE id = ?"
        )
        .bind(cs.programm_id)
        .first<FoerderprogrammRow>();

      if (program) {
        systemPrompt += `\n\nAKTUELLES FÖRDERPROGRAMM: ${program.titel}
PHASE: ${cs.phase}
VORAUSSETZUNGEN: ${(program.rechtliche_voraussetzungen || "").slice(0, 2000)}`;
      }
    }
  }

  // Add user message
  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

  // Build AI messages (keep last 20 messages for context)
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: aiMessages,
    max_tokens: 1500,
  })) as { response?: string };

  const assistantMessage =
    result.response || "Entschuldigung, ich konnte keine Antwort generieren.";
  messages.push({
    role: "assistant",
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  // Save conversation
  if (conversation) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(JSON.stringify(messages), conversation.id)
      .run();
  } else {
    const convId = conversation_id || crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_conversations (id, case_id, profile_id, context, messages)
       VALUES (?, ?, ?, ?, ?)`
      )
      .bind(convId, case_id ?? null, profile.id, context, JSON.stringify(messages))
      .run();
    conversation = { id: convId } as FoerdermittelConversationRow;
  }

  return c.json({
    success: true,
    data: {
      conversation_id: conversation!.id,
      message: assistantMessage,
    },
  });
});

// Get conversation history
foerdermittel.get("/chat/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const conversation = await bafaDb
    .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
    .bind(conversationId, profile.id)
    .first<FoerdermittelConversationRow>();

  if (!conversation) return c.json({ success: false, error: "Konversation nicht gefunden" }, 404);

  return c.json({
    success: true,
    data: {
      ...conversation,
      messages: JSON.parse(conversation.messages),
    },
  });
});

// ============================================
// Documents: Upload & tracking
// ============================================

foerdermittel.post("/cases/:caseId/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("caseId");
  const bafaDb = c.env.BAFA_DB;
  const r2 = c.env.REPORTS;

  // Verify ownership
  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const stepId = formData.get("step_id") as string | null;
  const dokumentTyp = (formData.get("dokument_typ") as string) || "custom";

  if (!file) return c.json({ success: false, error: "Datei erforderlich" }, 400);

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ success: false, error: "Datei zu groß (max 10 MB)" }, 400);
  }

  // Upload to R2
  const docId = crypto.randomUUID();
  const r2Key = `foerdermittel/${caseId}/${docId}-${file.name}`;
  await r2.put(r2Key, await file.arrayBuffer(), {
    customMetadata: { caseId, dokumentTyp, originalName: file.name },
  });

  // Save metadata
  await bafaDb
    .prepare(
      `INSERT INTO foerdermittel_dokumente (id, case_id, step_id, dokument_typ, dateiname, dateityp, dateigroesse, r2_key, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`
    )
    .bind(docId, caseId, stepId ?? null, dokumentTyp, file.name, file.type, file.size, r2Key)
    .run();

  // If linked to a step, mark step as in_progress
  if (stepId) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_case_steps SET status = 'in_progress' WHERE id = ? AND case_id = ?"
      )
      .bind(stepId, caseId)
      .run();
  }

  return c.json({ success: true, data: { id: docId, r2_key: r2Key } }, 201);
});

// List documents for a case
foerdermittel.get("/cases/:caseId/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("caseId");
  const bafaDb = c.env.BAFA_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const docs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_dokumente WHERE case_id = ? ORDER BY uploaded_at DESC")
    .bind(caseId)
    .all<FoerdermittelDokumentRow>();

  return c.json({ success: true, data: { dokumente: docs.results ?? [] } });
});

// ============================================
// Notifications
// ============================================

foerdermittel.get("/notifications", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;

  const notifications = await bafaDb
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
      notifications: notifications.results ?? [],
      unread_count: unreadCount?.count ?? 0,
    },
  });
});

foerdermittel.patch("/notifications/:id/read", requireAuth, async (c) => {
  const user = c.get("user");
  const notifId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;

  await bafaDb
    .prepare("UPDATE foerdermittel_benachrichtigungen SET gelesen = 1 WHERE id = ? AND user_id = ?")
    .bind(notifId, user.id)
    .run();

  return c.json({ success: true });
});

// ============================================
// Favorites: Bookmark programs
// ============================================

// Favoriten-Routes extracted into ./favoriten.ts (F-008).

// GET /program-documents/:programId — fetch required documents for a program
foerdermittel.get("/program-documents/:programId", requireAuth, async (c) => {
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

export { foerdermittel };
