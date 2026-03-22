// Netzwerk Routes - Berater profiles and connection requests
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import * as NetzwerkRepo from "../repositories/netzwerk.repository";

const netzwerk = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// Public: List berater
// ============================================

// GET /berater — list consultants with optional filters
netzwerk.get("/berater", async (c) => {
  const { spezialisierung, region, page, pageSize } = c.req.query();
  const result = await NetzwerkRepo.listBerater(c.env.DB, {
    spezialisierung: spezialisierung || undefined,
    region: region || undefined,
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 20,
  });
  return c.json({ success: true, ...result });
});

// GET /berater/:id — consultant profile by profile ID
netzwerk.get("/berater/:id", async (c) => {
  const id = c.req.param("id");
  const profile = await NetzwerkRepo.getBeraterProfileById(c.env.DB, id);
  if (!profile) {
    return c.json({ success: false, error: "Berater nicht gefunden" }, 404);
  }
  return c.json({ success: true, profile });
});

// ============================================
// Auth-required: Own profile
// ============================================

// GET /profil — get own berater profile
netzwerk.get("/profil", requireAuth, async (c) => {
  const user = c.get("user");
  const profile = await NetzwerkRepo.getBeraterProfile(c.env.DB, user.id);
  return c.json({ success: true, profile });
});

const profilSchema = z.object({
  spezialisierung: z.string().optional(),
  regionen: z.string().optional(),
  bio: z.string().max(2000).optional(),
  erfahrung_jahre: z.number().int().min(0).max(99).optional(),
  verfuegbar: z.boolean().optional(),
});

// POST /profil — create or update own berater profile
netzwerk.post("/profil", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = profilSchema.safeParse(body);
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

  const profile = await NetzwerkRepo.createOrUpdateProfile(c.env.DB, user.id, parsed.data);
  return c.json({ success: true, profile });
});

// ============================================
// Auth-required: Anfragen (connection requests)
// ============================================

// GET /anfragen — list my connection requests (sent + received)
netzwerk.get("/anfragen", requireAuth, async (c) => {
  const user = c.get("user");
  const anfragen = await NetzwerkRepo.listAnfragen(c.env.DB, user.id);
  return c.json({ success: true, anfragen });
});

const anfrageSchema = z.object({
  an_user_id: z.string().uuid(),
  nachricht: z.string().max(1000).optional(),
});

// POST /anfragen — send a connection request
netzwerk.post("/anfragen", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = anfrageSchema.safeParse(body);
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

  if (parsed.data.an_user_id === user.id) {
    return c.json({ success: false, error: "Kann keine Anfrage an sich selbst senden" }, 400);
  }

  const anfrage = await NetzwerkRepo.createAnfrage(
    c.env.DB,
    user.id,
    parsed.data.an_user_id,
    parsed.data.nachricht ?? null
  );
  return c.json({ success: true, anfrage }, 201);
});

const statusSchema = z.object({
  status: z.enum(["angenommen", "abgelehnt"]),
});

// PATCH /anfragen/:id — accept or reject a connection request
netzwerk.patch("/anfragen/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const anfrageId = c.req.param("id");
  const body = await c.req.json();
  const parsed = statusSchema.safeParse(body);
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

  const anfrage = await NetzwerkRepo.updateAnfrageStatus(
    c.env.DB,
    anfrageId,
    user.id,
    parsed.data.status
  );
  if (!anfrage) {
    return c.json({ success: false, error: "Anfrage nicht gefunden oder keine Berechtigung" }, 404);
  }
  return c.json({ success: true, anfrage });
});

export { netzwerk };
