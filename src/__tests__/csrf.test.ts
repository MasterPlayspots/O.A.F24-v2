// CSRF Protection Tests
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb } from "./test-utils";

beforeAll(async () => {
  await setupTestDb(env.DB);
});

describe("CSRF Protection", () => {
  it("blocks POST requests from disallowed origins", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.com",
      },
      body: JSON.stringify({
        email: "csrf@example.com",
        password: "Secure#Pass1",
        firstName: "Test",
        lastName: "User",
      }),
    });
    // Should be blocked by strict CORS check (403) before CSRF even runs
    expect(res.status).toBe(403);
  });

  it("allows POST requests from allowed origins", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://zfbf.info",
      },
      body: JSON.stringify({
        email: `csrf-ok-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: "Secure#Pass1",
        firstName: "Test",
        lastName: "User",
        privacyAccepted: true,
      }),
    });
    expect(res.status).toBe(200);
  });

  it("allows GET requests regardless of origin", async () => {
    const res = await SELF.fetch("https://api.test/", {
      headers: { Origin: "https://random-origin.com" },
    });
    // Health check should still work (not under /api/*)
    expect(res.status).toBe(200);
  });

  it("blocks POST requests from subdomain bypass attacks like evil-zfbf.info.com", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil-zfbf.info.attacker.com",
      },
      body: JSON.stringify({
        email: "bypass@example.com",
        password: "Secure#Pass1",
        firstName: "Test",
        lastName: "User",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("allows POST requests from www.zfbf.info", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.zfbf.info",
      },
      body: JSON.stringify({
        email: `csrf-www-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: "Secure#Pass1",
        firstName: "Test",
        lastName: "User",
        privacyAccepted: true,
      }),
    });
    expect(res.status).toBe(200);
  });

  // TODO: Fix Vercel preview deployment origin handling in CORS middleware
  it.skip("allows POST requests from *.vercel.app preview deployments", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://my-preview-123.vercel.app",
      },
      body: JSON.stringify({
        email: `csrf-vercel-${crypto.randomUUID().slice(0, 8)}@example.com`,
        password: "Secure#Pass1",
        firstName: "Test",
        lastName: "User",
      }),
    });
    expect(res.status).toBe(200);
  });
});
