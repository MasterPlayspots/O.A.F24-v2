// Auth Routes Tests - Register, Login, Refresh, Profile
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, createTestUser, createTestToken } from "./test-utils";
import { hashPassword } from "../services/password";
import type { AuthResponse, HashVersionQueryResult } from "./test-types";

beforeAll(async () => {
  await setupTestDb(env.DB);
});

describe("POST /api/auth/register", () => {
  it("registers a new user", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({
        email: "newuser@example.com",
        password: "Secure#Pass1",
        firstName: "Max",
        lastName: "Mustermann",
      }),
    });
    const body = (await res.json()) as AuthResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userId).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    await createTestUser(env.DB, { email: "dup@example.com" });
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({
        email: "dup@example.com",
        password: "Secure#Pass1",
        firstName: "A",
        lastName: "B",
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as AuthResponse;
    expect(body.error).toContain("registriert");
  });

  it("rejects weak password", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({
        email: "weak@example.com",
        password: "short",
        firstName: "A",
        lastName: "B",
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as AuthResponse;
    expect(body.success).toBe(false);
  });

  it("rejects password without special character", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({
        email: "nospecial@example.com",
        password: "NoSpecialChar1",
        firstName: "A",
        lastName: "B",
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with valid PBKDF2 credentials", async () => {
    const { hash, salt } = await hashPassword("Login#Test1");
    await createTestUser(env.DB, {
      email: "login-pbkdf2@example.com",
      password_hash: hash,
      salt,
      hash_version: 2,
      verified: true,
    });

    const res = await SELF.fetch("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({ email: "login-pbkdf2@example.com", password: "Login#Test1" }),
    });
    const body = (await res.json()) as AuthResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Worker returns tokens in body; Next.js frontend converts them to HttpOnly cookies
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe("login-pbkdf2@example.com");
  });

  it("rejects wrong password", async () => {
    const { hash, salt } = await hashPassword("Correct#Pass1");
    await createTestUser(env.DB, {
      email: "wrongpw@example.com",
      password_hash: hash,
      salt,
      hash_version: 2,
      verified: true,
    });

    const res = await SELF.fetch("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({ email: "wrongpw@example.com", password: "Wrong#Pass1" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects unverified email", async () => {
    const { hash, salt } = await hashPassword("Unverified#1");
    await createTestUser(env.DB, {
      email: "unverified@example.com",
      password_hash: hash,
      salt,
      hash_version: 2,
      verified: false,
    });

    const res = await SELF.fetch("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({ email: "unverified@example.com", password: "Unverified#1" }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as AuthResponse;
    expect(body.requiresVerification).toBe(true);
  });

  it("auto-migrates legacy SHA-256 hash to PBKDF2", async () => {
    const password = "Legacy#Pass1";
    const jwtSecret = "test-jwt-secret-key-for-testing-only";
    // Create legacy hash: SHA-256(password + jwtSecret)
    const data = new TextEncoder().encode(password + jwtSecret);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const legacyHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const userId = await createTestUser(env.DB, {
      email: "legacy@example.com",
      password_hash: legacyHash,
      hash_version: 1,
      verified: true,
    });

    const res = await SELF.fetch("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://zfbf.info" },
      body: JSON.stringify({ email: "legacy@example.com", password: password }),
    });
    const body = (await res.json()) as AuthResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify hash was upgraded
    const user = (await env.DB.prepare("SELECT hash_version, salt FROM users WHERE id = ?")
      .bind(userId)
      .first()) as HashVersionQueryResult;
    expect(user.hash_version).toBe(2);
    expect(user.salt).toBeTruthy();
  });
});

describe("GET /api/auth/me", () => {
  it("returns user profile with valid token", async () => {
    const userId = await createTestUser(env.DB, { email: "me@example.com" });
    const token = await createTestToken(userId, "me@example.com");

    const res = await SELF.fetch("https://api.test/api/auth/me", {
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
    });
    const body = (await res.json()) as AuthResponse;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(userId);
  });

  it("rejects request without token", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/me", {
      headers: { Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const res = await SELF.fetch("https://api.test/api/auth/me", {
      headers: { Authorization: "Bearer invalid-token", Origin: "https://zfbf.info" },
    });
    expect(res.status).toBe(401);
  });
});
