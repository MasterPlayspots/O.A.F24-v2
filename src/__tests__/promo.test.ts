// Promo Code Routes Tests - Validate, Redeem, Admin
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, createTestUser, createTestToken } from "./test-utils";
import type { PromoValidationResponse } from "./test-types";

beforeAll(async () => {
  await setupTestDb(env.DB);
  // Insert test promo codes
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses, total_uses, is_active) VALUES ('promo-1', 'TEST20', 'percent', 20, 100, 0, 1)"
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses, total_uses, is_active) VALUES ('promo-2', 'EXPIRED', 'percent', 10, 100, 100, 1)"
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses, total_uses, is_active) VALUES ('promo-3', 'INACTIVE', 'percent', 15, 100, 0, 0)"
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses, total_uses, is_active) VALUES ('promo-4', 'FIXED50', 'fixed', 5000, 50, 0, 1)"
    ),
  ]);
});

describe("POST /api/promo/validate", () => {
  it("validates active promo code", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TEST20" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.success).toBe(true);
    expect(body.discount.type).toBe("percent");
    expect(body.discount.value).toBe(20);
  });

  it("validates case-insensitively", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "test20" }),
    });
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.success).toBe(true);
  });

  it("rejects exhausted code", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "EXPIRED" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.success).toBe(false);
  });

  it("rejects inactive code", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "INACTIVE" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects nonexistent code", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "DOESNOTEXIST" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects empty code", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/promo/redeem", () => {
  it("redeems a promo code for authenticated user", async () => {
    const userId = await createTestUser(env.DB, { email: "promo-redeem@example.com" });
    const token = await createTestToken(userId, "promo-redeem@example.com");

    const res = await SELF.fetch("https://api.test/api/promo/redeem", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Origin: "https://zfbf.info",
      },
      body: JSON.stringify({ code: "FIXED50" }),
    });
    const body = (await res.json()) as PromoValidationResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.redemptionId).toBeTruthy();
    expect(body.discount.type).toBe("fixed");
    expect(body.discount.value).toBe(5000);
  });

  it("prevents double redemption by same user", async () => {
    const userId = await createTestUser(env.DB, { email: "promo-double@example.com" });
    const token = await createTestToken(userId, "promo-double@example.com");

    // Insert a prior redemption
    await env.DB.prepare(
      "INSERT INTO promo_redemptions (id, user_id, promo_code_id) VALUES (?, ?, ?)"
    )
      .bind(crypto.randomUUID(), userId, "promo-1")
      .run();

    const res = await SELF.fetch("https://api.test/api/promo/redeem", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Origin: "https://zfbf.info",
      },
      body: JSON.stringify({ code: "TEST20" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.error).toContain("bereits");
  });

  it("requires authentication", async () => {
    const res = await SELF.fetch("https://api.test/api/promo/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({ code: "TEST20" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Admin Promo Routes", () => {
  it("allows admin to list promo codes", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "promo-admin@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "promo-admin@example.com", "admin");

    const res = await SELF.fetch("https://api.test/api/promo/codes", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.codes)).toBe(true);
  });

  it("allows admin to create promo code", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "promo-create@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "promo-create@example.com", "admin");

    const res = await SELF.fetch("https://api.test/api/promo/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Origin: "https://zfbf.info",
      },
      body: JSON.stringify({
        code: "NEWCODE",
        discountType: "percent",
        discountValue: 25,
        maxUses: 50,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as PromoValidationResponse;
    expect(body.success).toBe(true);
    expect(body.code).toBe("NEWCODE");
  });

  it("rejects non-admin from listing codes", async () => {
    const userId = await createTestUser(env.DB, {
      email: "promo-nonadmin@example.com",
      role: "user",
    });
    const token = await createTestToken(userId, "promo-nonadmin@example.com", "user");

    const res = await SELF.fetch("https://api.test/api/promo/codes", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(403);
  });
});
