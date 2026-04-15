// GDPR (DSGVO) Routes Tests - Export, Deletion, Privacy Consent
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, setupBafaDb, createTestUser, createTestToken } from "./test-utils";

beforeAll(async () => {
  await setupTestDb(env.DB);
  await setupBafaDb(env.BAFA_DB);
});

describe("GET /api/user/export", () => {
  it("exports all user data (DSGVO Art. 15)", async () => {
    const userId = await createTestUser(env.DB, { email: "export@example.com" });
    const token = await createTestToken(userId, "export@example.com");

    // Create some test data
    await env.DB.prepare(
      "INSERT INTO reports (id, user_id, status, company_name) VALUES (?, ?, 'generiert', 'Test GmbH')"
    )
      .bind(crypto.randomUUID(), userId)
      .run();

    const res = await SELF.fetch("https://api.test/api/user/export", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    const body = (await res.json()) as ApiResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.dsgvoArticle).toContain("Art. 15");
    expect(body.data.user).toBeTruthy();
    expect(body.data.user.email).toBe("export@example.com");
    expect(Array.isArray(body.data.reports)).toBe(true);
    expect(body.data.reports.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await SELF.fetch("https://api.test/api/user/export", {
      headers: { Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/user/account", () => {
  it("soft-deletes and anonymizes user data (DSGVO Art. 17)", async () => {
    const userId = await createTestUser(env.DB, {
      email: "delete-me@example.com",
      firstName: "Max",
      lastName: "Mustermann",
    });
    const token = await createTestToken(userId, "delete-me@example.com");

    const res = await SELF.fetch("https://api.test/api/user/account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    const body = (await res.json()) as ApiResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("gelöscht");

    // Verify data was anonymized
    const user = (await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first()) as UserQueryResult;
    expect(user.first_name).toBe("[GELÖSCHT]");
    expect(user.last_name).toBe("[GELÖSCHT]");
    expect(user.email).toContain("@deleted.local");
    expect(user.deleted_at).toBeTruthy();
    expect(user.password_hash).toBe("");
  });
});

describe("POST /api/user/privacy-consent", () => {
  it("records privacy consent timestamp", async () => {
    const userId = await createTestUser(env.DB, { email: "consent@example.com" });
    const token = await createTestToken(userId, "consent@example.com");

    const res = await SELF.fetch("https://api.test/api/user/privacy-consent", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    const body = (await res.json()) as ApiResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const user = (await env.DB.prepare("SELECT privacy_accepted_at FROM users WHERE id = ?")
      .bind(userId)
      .first()) as PrivacyQueryResult;
    expect(user.privacy_accepted_at).toBeTruthy();
  });
});
