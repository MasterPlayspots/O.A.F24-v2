// Nachrichten Routes - Messaging between users
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import * as NachrichtenRepo from "../repositories/nachrichten.repository";

const nachrichten = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication
nachrichten.use("/*", requireAuth);

// GET / — list conversations for the authenticated user
nachrichten.get("/", async (c) => {
  const user = c.get("user");
  const conversations = await NachrichtenRepo.listConversations(c.env.DB, user.id);
  return c.json({ success: true, conversations });
});

// POST / — start a new conversation
nachrichten.post("/", async (c) => {
  const user = c.get("user");
  const parsed = z
    .object({
      toUserId: z.string().min(1, "Empfänger ist erforderlich"),
      inhalt: z.string().min(1, "Nachricht darf nicht leer sein").max(5000),
    })
    .safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }

  if (parsed.data.toUserId === user.id) {
    return c.json({ success: false, error: "Sie können sich nicht selbst schreiben" }, 400);
  }

  const result = await NachrichtenRepo.startConversation(
    c.env.DB,
    user.id,
    parsed.data.toUserId,
    parsed.data.inhalt
  );

  if (!result) {
    return c.json({ success: false, error: "Empfänger nicht gefunden" }, 404);
  }

  return c.json(
    { success: true, conversationId: result.conversationId, message: result.message },
    201
  );
});

// GET /:conversationId — get messages for a conversation
nachrichten.get("/:conversationId", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("conversationId");
  const messages = await NachrichtenRepo.getMessages(c.env.DB, conversationId, user.id);

  if (messages === null) {
    return c.json({ success: false, error: "Konversation nicht gefunden" }, 404);
  }

  return c.json({ success: true, messages });
});

// POST /:conversationId — send a message in a conversation
nachrichten.post("/:conversationId", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("conversationId");
  const parsed = z
    .object({
      inhalt: z.string().min(1, "Nachricht darf nicht leer sein").max(5000),
    })
    .safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }

  const message = await NachrichtenRepo.sendMessage(
    c.env.DB,
    conversationId,
    user.id,
    parsed.data.inhalt
  );

  if (!message) {
    return c.json({ success: false, error: "Konversation nicht gefunden oder kein Zugriff" }, 404);
  }

  return c.json({ success: true, message }, 201);
});

// PATCH /:conversationId/read — mark conversation as read
nachrichten.patch("/:conversationId/read", async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("conversationId");
  const ok = await NachrichtenRepo.markRead(c.env.DB, conversationId, user.id);

  if (!ok) {
    return c.json({ success: false, error: "Konversation nicht gefunden" }, 404);
  }

  return c.json({ success: true });
});

export { nachrichten };
