// WebAuthn Passkey Registration & Authentication Routes
import { Hono } from "hono";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { Bindings, Variables, PasskeyCredential } from "../../types";

type AuthenticatorTransportFuture =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";

const webauthn = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper: determine RP_ID and origin based on environment
function getRpConfig(env: Bindings) {
  const isProduction = env.ENVIRONMENT === "production";
  return {
    rpName: "Fund24",
    rpID: isProduction ? "fund24.io" : "localhost",
    origin: isProduction ? "https://fund24.io" : "http://localhost:3000",
  };
}

// Helper: base64url encode/decode for credential IDs
function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64url(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================
// POST /register-options
// ============================================
webauthn.post("/register-options", async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();
    if (!email) {
      return c.json({ success: false, error: "E-Mail ist erforderlich" }, 400);
    }

    const { rpName, rpID } = getRpConfig(c.env);

    // Check if user already exists and get existing credentials for exclusion
    const existingUser = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL"
    )
      .bind(email)
      .first<{ id: string }>();

    let excludeCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

    if (existingUser) {
      const creds = await c.env.DB.prepare(
        "SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ?"
      )
        .bind(existingUser.id)
        .all<{ credential_id: string; transports: string | null }>();

      excludeCredentials = (creds.results || []).map((cred) => ({
        id: cred.credential_id,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      }));
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userDisplayName: email,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge in KV with 5 min TTL
    await c.env.SESSIONS.put(`webauthn:challenge:${email}`, options.challenge, {
      expirationTtl: 300,
    });

    return c.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// POST /register-verify
// ============================================
webauthn.post("/register-verify", async (c) => {
  try {
    const { email, credential, role } = await c.req.json<{
      email: string;
      credential: unknown;
      role?: string;
    }>();

    if (!email || !credential) {
      return c.json({ success: false, error: "E-Mail und Credential sind erforderlich" }, 400);
    }

    const { rpID, origin } = getRpConfig(c.env);

    // Retrieve challenge from KV
    const expectedChallenge = await c.env.SESSIONS.get(`webauthn:challenge:${email}`);
    if (!expectedChallenge) {
      return c.json({ success: false, error: "Challenge abgelaufen oder nicht gefunden" }, 400);
    }

    // Verify registration
    const verification = await verifyRegistrationResponse({
      response: credential as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ success: false, error: "Passkey-Verifizierung fehlgeschlagen" }, 400);
    }

    // Clean up challenge
    await c.env.SESSIONS.delete(`webauthn:challenge:${email}`);

    const { credential: regCredential, credentialDeviceType } = verification.registrationInfo;

    // Encode credential data for storage
    const credentialIdB64url = bufferToBase64url(regCredential.publicKey);
    const credentialIdStored = regCredential.id;
    const publicKeyB64 = bufferToBase64(regCredential.publicKey);

    // Check if user already exists
    let user = await c.env.DB.prepare(
      "SELECT id, email FROM users WHERE email = ? AND deleted_at IS NULL"
    )
      .bind(email)
      .first<{ id: string; email: string }>();

    let isNewUser = false;
    const userRole = role || "unternehmen";

    if (!user) {
      // Create new user
      isNewUser = true;
      const userId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, salt, hash_version, first_name, last_name, role, email_verified, onboarding_completed, privacy_accepted_at, created_at, updated_at)
         VALUES (?, ?, '', '', 0, '', '', ?, 1, 0, datetime('now'), datetime('now'), datetime('now'))`
      )
        .bind(userId, email, userRole)
        .run();

      user = { id: userId, email };
    }

    // Store passkey credential
    const credId = crypto.randomUUID();
    const transportsJson = regCredential.transports
      ? JSON.stringify(regCredential.transports)
      : null;

    await c.env.DB.prepare(
      `INSERT INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_type, transports, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        credId,
        user.id,
        credentialIdStored,
        publicKeyB64,
        regCredential.counter,
        credentialDeviceType || null,
        transportsJson
      )
      .run();

    // Create session token
    const token = crypto.randomUUID();
    await c.env.SESSIONS.put(
      `session:${token}`,
      JSON.stringify({ userId: user.id, email: user.email, role: userRole }),
      { expirationTtl: 604800 } // 7 days
    );

    return c.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
      isNewUser,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// POST /login-options
// ============================================
webauthn.post("/login-options", async (c) => {
  try {
    const body = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string });
    const { rpID } = getRpConfig(c.env);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    // Store challenge in KV — use email if provided, otherwise use challenge as key
    const challengeKey = body.email
      ? `webauthn:challenge:${body.email}`
      : `webauthn:challenge:login:${options.challenge}`;

    await c.env.SESSIONS.put(challengeKey, options.challenge, {
      expirationTtl: 300,
    });

    return c.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// POST /login-verify
// ============================================
webauthn.post("/login-verify", async (c) => {
  try {
    const { credential } = await c.req.json<{ credential: unknown }>();
    if (!credential) {
      return c.json({ success: false, error: "Credential ist erforderlich" }, 400);
    }

    const { rpID, origin } = getRpConfig(c.env);

    // Extract credential_id from the response to look up stored credential
    const credResponse = credential as { id: string; response: { clientDataJSON: string } };
    const credentialIdFromAuth = credResponse.id;

    // Look up stored credential by credential_id
    const storedCred = await c.env.DB.prepare(
      `SELECT pc.*, u.id as uid, u.email, u.role
       FROM passkey_credentials pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.credential_id = ? AND u.deleted_at IS NULL`
    )
      .bind(credentialIdFromAuth)
      .first<PasskeyCredential & { uid: string; email: string; role: string }>();

    if (!storedCred) {
      return c.json({ success: false, error: "Passkey nicht gefunden" }, 400);
    }

    // Verify authentication using async challenge verifier
    // We check both possible challenge keys since we don't know which was used
    const verification = await verifyAuthenticationResponse({
      response: credential as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge: async (challenge: string) => {
        // Check email-based key
        const emailChallenge = await c.env.SESSIONS.get(`webauthn:challenge:${storedCred.email}`);
        if (emailChallenge === challenge) return true;

        // Check login-based key
        const loginChallenge = await c.env.SESSIONS.get(`webauthn:challenge:login:${challenge}`);
        if (loginChallenge === challenge) return true;

        return false;
      },
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credentialIdFromAuth,
        publicKey: base64ToBuffer(storedCred.public_key),
        counter: storedCred.counter,
        transports: storedCred.transports
          ? (JSON.parse(storedCred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) {
      return c.json({ success: false, error: "Authentifizierung fehlgeschlagen" }, 400);
    }

    // Update counter
    await c.env.DB.prepare("UPDATE passkey_credentials SET counter = ? WHERE id = ?")
      .bind(verification.authenticationInfo.newCounter, storedCred.id)
      .run();

    // Clean up challenge keys
    await c.env.SESSIONS.delete(`webauthn:challenge:${storedCred.email}`);

    // Create session
    const token = crypto.randomUUID();
    await c.env.SESSIONS.put(
      `session:${token}`,
      JSON.stringify({
        userId: storedCred.uid,
        email: storedCred.email,
        role: storedCred.role,
      }),
      { expirationTtl: 604800 }
    );

    return c.json({
      success: true,
      token,
      user: { id: storedCred.uid, email: storedCred.email },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

export { webauthn };
