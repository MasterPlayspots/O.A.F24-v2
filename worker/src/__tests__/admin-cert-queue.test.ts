// Admin BAFA Cert-Queue handlers - GAP-001
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, setupBafaDb, createTestUser, createTestToken } from "./test-utils";

type Json = { success: boolean; certs?: unknown[]; error?: string };

beforeAll(async () => {
  await setupTestDb(env.DB);
  await setupBafaDb(env.BAFA_DB);
  // Migration 027 columns - shared test schema doesn't have them yet
  for (const sql of [
    "ALTER TABLE users ADD COLUMN bafa_cert_status TEXT DEFAULT 'none'",
    "ALTER TABLE users ADD COLUMN bafa_cert_uploaded_at TEXT",
    "ALTER TABLE users ADD COLUMN bafa_berater_nr TEXT",
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* already added by a previous test run */
    }
  }
});

describe("Admin Cert-Queue (GAP-001)", () => {
  it("GET /bafa-cert/pending - 401 without auth", async () => {
    const res = await SELF.fetch("https://api.test/api/admin/bafa-cert/pending", {
      headers: { Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(401);
  });

  it("GET /bafa-cert/pending - 403 for non-admin", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-user@example.com",
      role: "user",
    });
    const token = await createTestToken(userId, "cert-user@example.com", "user");
    const res = await SELF.fetch("https://api.test/api/admin/bafa-cert/pending", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(403);
  });

  it("GET /bafa-cert/pending - admin gets pending list only", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "cert-admin@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "cert-admin@example.com", "admin");

    // Two pending, one approved - only pending should appear
    const pendingA = await createTestUser(env.DB, { email: "cert-p1@example.com" });
    const pendingB = await createTestUser(env.DB, { email: "cert-p2@example.com" });
    const approved = await createTestUser(env.DB, { email: "cert-a1@example.com" });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now'), bafa_berater_nr='NR-1' WHERE id=?"
      ).bind(pendingA),
      env.DB.prepare(
        "UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now'), bafa_berater_nr='NR-2' WHERE id=?"
      ).bind(pendingB),
      env.DB.prepare(
        "UPDATE users SET bafa_cert_status='approved', bafa_cert_uploaded_at=datetime('now'), bafa_berater_nr='NR-3' WHERE id=?"
      ).bind(approved),
    ]);

    const res = await SELF.fetch("https://api.test/api/admin/bafa-cert/pending", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.success).toBe(true);
    const ids = (body.certs ?? []).map((c: { id: string }) => c.id);
    expect(ids).toContain(pendingA);
    expect(ids).toContain(pendingB);
    expect(ids).not.toContain(approved);
  });

  it("POST /bafa-cert/:id/approve - transitions pending -> approved", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "cert-admin-2@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "cert-admin-2@example.com", "admin");
    const target = await createTestUser(env.DB, { email: "cert-approve@example.com" });
    await env.DB.prepare(
      "UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now') WHERE id=?"
    )
      .bind(target)
      .run();

    const res = await SELF.fetch(`https://api.test/api/admin/bafa-cert/${target}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.success).toBe(true);

    const row = await env.DB
      .prepare("SELECT bafa_cert_status FROM users WHERE id = ?")
      .bind(target)
      .first<{ bafa_cert_status: string }>();
    expect(row?.bafa_cert_status).toBe("approved");

    const audit = await env.DB
      .prepare("SELECT event_type FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC")
      .bind(adminId)
      .first<{ event_type: string }>();
    expect(audit?.event_type).toBe("bafa_cert_approved");
  });

  it("POST /bafa-cert/:id/reject - transitions pending -> rejected", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "cert-admin-3@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "cert-admin-3@example.com", "admin");
    const target = await createTestUser(env.DB, { email: "cert-reject@example.com" });
    await env.DB.prepare(
      "UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now') WHERE id=?"
    )
      .bind(target)
      .run();

    const res = await SELF.fetch(`https://api.test/api/admin/bafa-cert/${target}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(200);
    const row = await env.DB
      .prepare("SELECT bafa_cert_status FROM users WHERE id = ?")
      .bind(target)
      .first<{ bafa_cert_status: string }>();
    expect(row?.bafa_cert_status).toBe("rejected");
  });

  it("POST /bafa-cert/:id/approve - 404 when not pending", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "cert-admin-4@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "cert-admin-4@example.com", "admin");
    const target = await createTestUser(env.DB, { email: "cert-none@example.com" });
    // status left at default 'none'

    const res = await SELF.fetch(`https://api.test/api/admin/bafa-cert/${target}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as Json;
    expect(body.success).toBe(false);
  });
});
