import { Hono } from "hono";
import { z } from "zod";
import type {
  Bindings,
  Variables,
  FoerderprogrammRow,
  FoerdermittelProfileRow,
  FoerdermittelCaseRow,
  FoerdermittelConversationRow,
} from "../../types";
import { requireAuth } from "../../middleware/auth";

export const chat = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const caseChatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversation_id: z.string().optional(),
});

chat.post("/cases/:id/chat", requireAuth, async (c) => {
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

  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

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

  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

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

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  case_id: z.string().optional(),
  context: z.enum(["matchmaking", "funnel_guidance", "document_help"]).default("funnel_guidance"),
  conversation_id: z.string().optional(),
});

chat.post("/chat", requireAuth, async (c) => {
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

  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil erforderlich" }, 400);

  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}`;

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

  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

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

chat.get("/chat/:id", requireAuth, async (c) => {
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
