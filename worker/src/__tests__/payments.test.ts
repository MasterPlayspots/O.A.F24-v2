// Payment Routes Tests - Stripe webhook, orders
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, setupBafaDb, createTestUser, createTestToken } from "./test-utils";

beforeAll(async () => {
  await setupTestDb(env.DB);
  await setupBafaDb(env.BAFA_DB);
});

describe("Payment Routes", () => {
  describe("POST /api/orders/create", () => {
    it("creates an order with free payment (invoice)", async () => {
      const userId = await createTestUser(env.DB, { email: "order-free@example.com" });
      const token = await createTestToken(userId, "order-free@example.com");

      // Insert a 100% promo code
      await env.DB.prepare(
        "INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses, total_uses, is_active) VALUES ('promo-free', 'FREE100', 'percent', 100, 50, 0, 1)"
      ).run();

      const res = await SELF.fetch("https://api.test/api/orders/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
        body: JSON.stringify({
          packageType: "einzel",
          promoCode: "FREE100",
          paymentMethod: "invoice",
        }),
      });
      const body = (await res.json()) as PaymentSessionResponse;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.status).toBe("completed");
      expect(body.reportsAdded).toBe(1);
    });

    it("creates a pending order for stripe", async () => {
      const userId = await createTestUser(env.DB, { email: "order-stripe@example.com" });
      const token = await createTestToken(userId, "order-stripe@example.com");

      const res = await SELF.fetch("https://api.test/api/orders/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
        body: JSON.stringify({ packageType: "starter", paymentMethod: "stripe" }),
      });
      const body = (await res.json()) as PaymentSessionResponse;
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.status).toBe("pending");
      expect(body.amount).toBe(14900);
    });

    it("rejects invalid package type", async () => {
      const userId = await createTestUser(env.DB, { email: "order-invalid@example.com" });
      const token = await createTestToken(userId, "order-invalid@example.com");

      const res = await SELF.fetch("https://api.test/api/orders/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Origin: "https://zfbf.info",
        },
        body: JSON.stringify({ packageType: "mega", paymentMethod: "stripe" }),
      });
      expect(res.status).toBe(400);
    });

    it("requires authentication", async () => {
      const res = await SELF.fetch("https://api.test/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
        body: JSON.stringify({ packageType: "einzel", paymentMethod: "stripe" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/payments/stripe/webhook", () => {
    it("rejects request without stripe-signature", async () => {
      const res = await SELF.fetch("https://api.test/api/payments/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"type":"checkout.session.completed"}',
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as PaymentSessionResponse;
      expect(body.error).toContain("signature");
    });

    it("rejects invalid stripe signature", async () => {
      const res = await SELF.fetch("https://api.test/api/payments/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": "t=123,v1=invalidsig" },
        body: '{"type":"checkout.session.completed"}',
      });
      // 401 Unauthorized: no valid session (403 would mean forbidden despite auth)
      expect(res.status).toBe(401);
    });
  });
});

describe("Health & 404", () => {
  it("returns health check", async () => {
    const res = await SELF.fetch("https://api.test/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as PaymentSessionResponse;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("zfbf-api");
  });

  it("returns /health endpoint", async () => {
    const res = await SELF.fetch("https://api.test/health");
    const body = (await res.json()) as PaymentSessionResponse;
    expect(["healthy", "degraded"]).toContain(body.status);
    expect(body.timestamp).toBeTruthy();
  });

  it("returns 404 for unknown endpoints", async () => {
    const res = await SELF.fetch("https://api.test/api/nonexistent");
    expect(res.status).toBe(404);
    const body = (await res.json()) as PaymentSessionResponse;
    expect(body.success).toBe(false);
  });
});
