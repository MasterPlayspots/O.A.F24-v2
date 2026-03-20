// Reports Routes Tests - CRUD, Preview, Download (updated for bafa_antraege schema)
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import {
  setupTestDb,
  setupBafaDb,
  createTestUser,
  createTestAntrag,
  createTestToken,
} from "./test-utils";

beforeAll(async () => {
  await setupTestDb(env.DB);
  await setupBafaDb(env.BAFA_DB);
});

describe("Reports CRUD", () => {
  describe("POST /api/reports", () => {
    it("creates a new draft report", async () => {
      const userId = await createTestUser(env.DB, { email: "report-create@example.com" });
      const token = await createTestToken(userId, "report-create@example.com");

      const res = await SELF.fetch("https://api.test/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
      });
      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.reportId).toBeTruthy();

      // Verify antrag was created in BAFA_DB
      const antrag = (await env.BAFA_DB.prepare("SELECT * FROM antraege WHERE id = ?")
        .bind(body.reportId)
        .first()) as any;
      expect(antrag).toBeTruthy();
      expect(antrag.status).toBe("vorschau");
    });

    it("rejects when contingent is exhausted", async () => {
      const userId = await createTestUser(env.DB, { email: "report-noquota@example.com" });
      await env.DB.prepare(
        "UPDATE users SET kontingent_total = 0, kontingent_used = 0 WHERE id = ?"
      )
        .bind(userId)
        .run();
      const token = await createTestToken(userId, "report-noquota@example.com");

      const res = await SELF.fetch("https://api.test/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body.needsUpgrade).toBe(true);
    });

    it("requires authentication", async () => {
      const res = await SELF.fetch("https://api.test/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/reports", () => {
    it("lists user reports", async () => {
      const userId = await createTestUser(env.DB, { email: "report-list@example.com" });
      const token = await createTestToken(userId, "report-list@example.com");

      // Create a report with antrag
      await createTestAntrag(env.DB, env.BAFA_DB, userId, {
        companyName: "TestCo",
        branche: "handwerk",
      });

      const res = await SELF.fetch("https://api.test/api/reports", {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      });
      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("only returns own reports", async () => {
      const user1 = await createTestUser(env.DB, { email: "report-owner1@example.com" });
      const user2 = await createTestUser(env.DB, { email: "report-owner2@example.com" });

      const r1 = await createTestAntrag(env.DB, env.BAFA_DB, user1);
      const r2 = await createTestAntrag(env.DB, env.BAFA_DB, user2);

      const token1 = await createTestToken(user1, "report-owner1@example.com");
      const res = await SELF.fetch("https://api.test/api/reports", {
        headers: { Authorization: `Bearer ${token1}`, Origin: "https://zfbf.info" },
      });
      const body = (await res.json()) as any;
      const ids = body.data.map((r: any) => r.id);
      expect(ids).toContain(r1);
      expect(ids).not.toContain(r2);
    });
  });

  describe("GET /api/reports/:id", () => {
    it("returns a single report with antrag and bausteine", async () => {
      const userId = await createTestUser(env.DB, { email: "report-single@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId, {
        status: "generiert",
        companyName: "MyCo",
      });
      const token = await createTestToken(userId, "report-single@example.com");

      // Add a baustein
      await env.BAFA_DB.prepare(
        "INSERT INTO antrag_bausteine (antrag_id, baustein_typ, baustein_name, inhalt, erstellt_am) VALUES (?, 'ausgangslage', 'ausgangslage', 'Test content', datetime('now'))"
      )
        .bind(antragId)
        .run();

      const res = await SELF.fetch(`https://api.test/api/reports/${antragId}`, {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      });
      const body = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(body.report).toBeTruthy();
      expect(body.antrag).toBeTruthy();
      expect(body.antrag.unternehmen_name).toBe("MyCo");
      expect(body.bausteine.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 404 for other users report", async () => {
      const user1 = await createTestUser(env.DB, { email: "report-notmine@example.com" });
      const user2 = await createTestUser(env.DB, { email: "report-other@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, user2);
      const token1 = await createTestToken(user1, "report-notmine@example.com");

      const res = await SELF.fetch(`https://api.test/api/reports/${antragId}`, {
        headers: { Authorization: `Bearer ${token1}`, Origin: "https://zfbf.info" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/reports/:id", () => {
    it("updates allowed fields in both databases", async () => {
      const userId = await createTestUser(env.DB, { email: "report-patch@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId);
      const token = await createTestToken(userId, "report-patch@example.com");

      const res = await SELF.fetch(`https://api.test/api/reports/${antragId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
        body: JSON.stringify({ company_name: "Updated GmbH", branche: "handel" }),
      });
      expect(res.status).toBe(200);

      // Verify zfbf-db ownership record
      const report = (await env.DB.prepare("SELECT company_name, branche FROM reports WHERE id = ?")
        .bind(antragId)
        .first()) as any;
      expect(report.company_name).toBe("Updated GmbH");
      expect(report.branche).toBe("handel");

      // Verify bafa_antraege record
      const antrag = (await env.BAFA_DB.prepare(
        "SELECT unternehmen_name, branche_id FROM antraege WHERE id = ?"
      )
        .bind(antragId)
        .first()) as any;
      expect(antrag.unternehmen_name).toBe("Updated GmbH");
      expect(antrag.branche_id).toBe("handel");
    });
  });

  describe("POST /api/reports/:id/finalize", () => {
    it("finalizes report and uses contingent", async () => {
      const userId = await createTestUser(env.DB, { email: "report-finalize@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId);
      const token = await createTestToken(userId, "report-finalize@example.com");

      const res = await SELF.fetch(`https://api.test/api/reports/${antragId}/finalize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
      });
      expect(res.status).toBe(200);

      const report = (await env.DB.prepare("SELECT status FROM reports WHERE id = ?")
        .bind(antragId)
        .first()) as any;
      expect(report.status).toBe("finalisiert");

      const antrag = (await env.BAFA_DB.prepare("SELECT status FROM antraege WHERE id = ?")
        .bind(antragId)
        .first()) as any;
      expect(antrag.status).toBe("pending");

      const user = (await env.DB.prepare("SELECT kontingent_used FROM users WHERE id = ?")
        .bind(userId)
        .first()) as any;
      expect(user.kontingent_used).toBe(1);
    });
  });

  describe("GET /api/reports/download/:token", () => {
    it("downloads unlocked report with valid token", async () => {
      const userId = await createTestUser(env.DB, { email: "report-download@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId, {
        status: "generiert",
        companyName: "DownloadCo",
        isUnlocked: true,
      });

      // Add a baustein for content
      await env.BAFA_DB.prepare(
        "INSERT INTO antrag_bausteine (antrag_id, baustein_typ, baustein_name, inhalt, erstellt_am) VALUES (?, 'ausgangslage', 'ausgangslage', 'Test download content', datetime('now'))"
      )
        .bind(antragId)
        .run();

      // Create download token in BAFA_DB
      const dlToken = crypto.randomUUID();
      const validUntil = new Date(Date.now() + 86400_000).toISOString();
      await env.BAFA_DB.prepare(
        "INSERT INTO download_tokens (id, antrag_id, token, gueltig_bis, downloads, max_downloads, erstellt_am) VALUES (?, ?, ?, ?, 0, 3, datetime('now'))"
      )
        .bind(crypto.randomUUID(), antragId, dlToken, validUntil)
        .run();

      const res = await SELF.fetch(`https://api.test/api/reports/download/${dlToken}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/html");
      expect(res.headers.get("Content-Disposition")).toContain("attachment");
    });

    it("rejects expired download token", async () => {
      const userId = await createTestUser(env.DB, { email: "report-expired-dl@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId, {
        status: "generiert",
        isUnlocked: true,
      });

      const dlToken = crypto.randomUUID();
      const expiredAt = new Date(Date.now() - 86400_000).toISOString();
      await env.BAFA_DB.prepare(
        "INSERT INTO download_tokens (id, antrag_id, token, gueltig_bis, downloads, max_downloads, erstellt_am) VALUES (?, ?, ?, ?, 0, 3, datetime('now'))"
      )
        .bind(crypto.randomUUID(), antragId, dlToken, expiredAt)
        .run();

      const res = await SELF.fetch(`https://api.test/api/reports/download/${dlToken}`);
      expect(res.status).toBe(403);
    });

    it("rejects when max downloads reached", async () => {
      const userId = await createTestUser(env.DB, { email: "report-maxdl@example.com" });
      const antragId = await createTestAntrag(env.DB, env.BAFA_DB, userId, {
        status: "generiert",
        isUnlocked: true,
      });

      const dlToken = crypto.randomUUID();
      const validUntil = new Date(Date.now() + 86400_000).toISOString();
      await env.BAFA_DB.prepare(
        "INSERT INTO download_tokens (id, antrag_id, token, gueltig_bis, downloads, max_downloads, erstellt_am) VALUES (?, ?, ?, ?, 3, 3, datetime('now'))"
      )
        .bind(crypto.randomUUID(), antragId, dlToken, validUntil)
        .run();

      const res = await SELF.fetch(`https://api.test/api/reports/download/${dlToken}`);
      expect(res.status).toBe(403);
    });

    it("rejects invalid download token", async () => {
      const res = await SELF.fetch("https://api.test/api/reports/download/nonexistent-token");
      expect(res.status).toBe(403);
    });
  });
});
