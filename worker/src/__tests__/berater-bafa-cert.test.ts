// Berater BAFA-Zert Upload — GAP-002
import { describe, it, expect, beforeAll } from "vitest";
import { env, SELF } from "cloudflare:test";
import { setupTestDb, setupBafaDb, createTestUser, createTestToken } from "./test-utils";

type StatusJson = {
  success: boolean;
  status?: "none" | "pending" | "approved" | "rejected";
  uploaded_at?: string | null;
  bafa_berater_nr?: string | null;
  error?: string;
};

beforeAll(async () => {
  await setupTestDb(env.DB);
  await setupBafaDb(env.BAFA_DB);
  // Share cert columns with the admin-cert-queue test; shared schema
  // in test-utils doesn't include them yet, so ALTER idempotently.
  for (const sql of [
    "ALTER TABLE users ADD COLUMN bafa_cert_status TEXT DEFAULT 'none'",
    "ALTER TABLE users ADD COLUMN bafa_cert_uploaded_at TEXT",
    "ALTER TABLE users ADD COLUMN bafa_berater_nr TEXT",
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* already exists */
    }
  }
});

function pdfFormData(filename = "cert.pdf", bafaNr = "DE-123-456", size = 2048) {
  const fd = new FormData();
  const bytes = new Uint8Array(size);
  // minimal-valid %PDF signature so the file isn't "empty"
  bytes[0] = 0x25;
  bytes[1] = 0x50;
  bytes[2] = 0x44;
  bytes[3] = 0x46;
  fd.append("file", new File([bytes], filename, { type: "application/pdf" }));
  fd.append("bafa_berater_nr", bafaNr);
  return fd;
}

describe("Berater BAFA-Zert Upload (GAP-002)", () => {
  it("POST /bafa-cert - 401 without auth", async () => {
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Origin: "https://zfbf.info" },
      body: pdfFormData(),
    });
    expect(res.status).toBe(401);
  });

  it("GET /bafa-cert/status - 401 without auth", async () => {
    const res = await SELF.fetch(
      "https://api.test/api/berater/bafa-cert/status",
      { headers: { Origin: "https://zfbf.info" } },
    );
    expect(res.status).toBe(401);
  });

  it("POST /bafa-cert - 403 for non-berater role", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-role-user@example.com",
      role: "user",
    });
    const token = await createTestToken(userId, "cert-role-user@example.com", "user");
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      body: pdfFormData(),
    });
    expect(res.status).toBe(403);
  });

  it("POST /bafa-cert - 400 without multipart body", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-berater-1@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-berater-1@example.com", "berater");
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: "https://zfbf.info",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bafa_berater_nr: "DE-123" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /bafa-cert - 400 when bafa_berater_nr missing", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-berater-2@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-berater-2@example.com", "berater");
    const fd = new FormData();
    fd.append(
      "file",
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "cert.pdf", {
        type: "application/pdf",
      }),
    );
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      body: fd,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as StatusJson;
    expect(body.error).toContain("bafa_berater_nr");
  });

  it("POST /bafa-cert - 400 for non-PDF content type", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-berater-3@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-berater-3@example.com", "berater");
    const fd = new FormData();
    fd.append(
      "file",
      new File([new Uint8Array(512)], "cert.png", { type: "image/png" }),
    );
    fd.append("bafa_berater_nr", "DE-000-0001");
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      body: fd,
    });
    expect(res.status).toBe(400);
  });

  it("POST /bafa-cert - 400 for oversized PDF (> 5 MB)", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-berater-4@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-berater-4@example.com", "berater");
    const size = 5 * 1024 * 1024 + 1; // 1 byte over
    const res = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      body: pdfFormData("big.pdf", "DE-BIG-001", size),
    });
    expect(res.status).toBe(400);
  });

  it("GET /bafa-cert/status - returns 'none' for fresh berater", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-fresh@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-fresh@example.com", "berater");
    const res = await SELF.fetch(
      "https://api.test/api/berater/bafa-cert/status",
      {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as StatusJson;
    expect(body.success).toBe(true);
    expect(body.status).toBe("none");
    expect(body.uploaded_at).toBeNull();
  });

  it("POST /bafa-cert - happy path: 200 + DB state pending + status endpoint reflects it", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-happy@example.com",
      role: "berater",
    });
    const token = await createTestToken(userId, "cert-happy@example.com", "berater");

    const upload = await SELF.fetch("https://api.test/api/berater/bafa-cert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      body: pdfFormData("happy.pdf", "DE-HAP-001"),
    });
    expect(upload.status).toBe(200);
    const uploadBody = (await upload.json()) as StatusJson;
    expect(uploadBody.success).toBe(true);
    expect(uploadBody.status).toBe("pending");
    expect(uploadBody.bafa_berater_nr).toBe("DE-HAP-001");

    const row = await env.DB
      .prepare(
        "SELECT bafa_cert_status, bafa_berater_nr FROM users WHERE id = ?",
      )
      .bind(userId)
      .first<{ bafa_cert_status: string; bafa_berater_nr: string }>();
    expect(row?.bafa_cert_status).toBe("pending");
    expect(row?.bafa_berater_nr).toBe("DE-HAP-001");

    const status = await SELF.fetch(
      "https://api.test/api/berater/bafa-cert/status",
      {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      },
    );
    const statusBody = (await status.json()) as StatusJson;
    expect(statusBody.status).toBe("pending");
    expect(statusBody.bafa_berater_nr).toBe("DE-HAP-001");
  });
});

describe("Admin BAFA-Cert Download (GAP-002)", () => {
  it("GET /api/admin/bafa-cert/:userId/download - 401 without auth", async () => {
    const res = await SELF.fetch(
      "https://api.test/api/admin/bafa-cert/any/download",
      { headers: { Origin: "https://zfbf.info" } },
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/bafa-cert/:userId/download - 403 for non-admin", async () => {
    const userId = await createTestUser(env.DB, {
      email: "cert-dl-user@example.com",
      role: "user",
    });
    const token = await createTestToken(userId, "cert-dl-user@example.com", "user");
    const res = await SELF.fetch(
      "https://api.test/api/admin/bafa-cert/any/download",
      {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      },
    );
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/bafa-cert/:userId/download - 404 when no cert uploaded", async () => {
    const adminId = await createTestUser(env.DB, {
      email: "cert-dl-admin@example.com",
      role: "admin",
    });
    const token = await createTestToken(adminId, "cert-dl-admin@example.com", "admin");
    const res = await SELF.fetch(
      "https://api.test/api/admin/bafa-cert/nope/download",
      {
        headers: { Authorization: `Bearer ${token}`, Origin: "https://zfbf.info" },
      },
    );
    expect(res.status).toBe(404);
  });
});
