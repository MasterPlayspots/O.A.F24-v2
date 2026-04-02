// Magic Link Authentication Routes
import { Hono } from "hono";
import { Resend } from "resend";
import type { Bindings, Variables } from "../../types";

const magicLink = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// POST / (send magic link)
// ============================================
magicLink.post("/", async (c) => {
  try {
    const { email, role } = await c.req.json<{ email: string; role?: string }>();
    if (!email) {
      return c.json({ success: false, error: "E-Mail ist erforderlich" }, 400);
    }

    // Rate limiting: max 3 requests per email per 15 minutes
    const rateLimitKey = `ratelimit:magic-link:${email}`;
    const attempts = await c.env.RATE_LIMIT.get(rateLimitKey);
    if (attempts && parseInt(attempts) >= 3) {
      return c.json(
        {
          success: false,
          error: "Zu viele Anfragen. Bitte versuchen Sie es in 15 Minuten erneut.",
        },
        429
      );
    }
    await c.env.RATE_LIMIT.put(rateLimitKey, String(parseInt(attempts || "0") + 1), {
      expirationTtl: 900,
    });

    // Generate token
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Invalidate old tokens
    await c.env.DB.prepare("UPDATE magic_link_tokens SET used = 1 WHERE email = ? AND used = 0")
      .bind(email)
      .run();

    // Insert new token
    await c.env.DB.prepare(
      `INSERT INTO magic_link_tokens (token, email, expires_at, used, created_at)
       VALUES (?, ?, ?, 0, datetime('now'))`
    )
      .bind(token, email, expiresAt)
      .run();

    // Build verify URL — derive base from request origin, fall back to FRONTEND_URL
    const origin = c.req.header("origin") || c.req.header("referer") || c.env.FRONTEND_URL;
    const baseUrl = origin.replace(/\/$/, "");
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
    const verifyUrl = `${baseUrl}/api/auth/magic-link/verify?token=${token}${roleParam}`;

    // Send email via Resend
    const resend = new Resend(c.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Fund24 <noreply@fund24.info>",
      to: [email],
      subject: "Ihr Anmelde-Link fuer Fund24",
      html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1a1a2e;">Fund24 – Anmeldung</h2>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>Sie haben eine Anmeldung bei Fund24 angefordert. Bitte klicken Sie auf den folgenden Link, um sich anzumelden:</p>
  <p style="margin: 30px 0; text-align: center;">
    <a href="${verifyUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Jetzt anmelden</a>
  </p>
  <p>Alternativ koennen Sie den folgenden Link in Ihren Browser kopieren:</p>
  <p style="word-break: break-all; font-size: 13px; color: #666;">${verifyUrl}</p>
  <p>Dieser Link ist 15 Minuten gueltig. Falls Sie diese Anmeldung nicht angefordert haben, koennen Sie diese E-Mail ignorieren.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
  <p style="font-size: 12px; color: #999;">Fund24 – Ihre Foerdermittel-Plattform<br/>Diese E-Mail wurde automatisch versendet.</p>
</body>
</html>`,
    });

    return c.json({ success: true, message: "Link gesendet" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// GET /verify
// ============================================
magicLink.get("/verify", async (c) => {
  try {
    const token = c.req.query("token");
    const roleFromUrl = c.req.query("role");
    if (!token) {
      return c.json({ success: false, error: "Token fehlt" }, 400);
    }

    // Look up token
    const row = await c.env.DB.prepare(
      "SELECT token, email, expires_at, used FROM magic_link_tokens WHERE token = ? AND used = 0"
    )
      .bind(token)
      .first<{ token: string; email: string; expires_at: string; used: number }>();

    if (!row) {
      return c.json({ success: false, error: "Ungueltiger oder bereits verwendeter Link" }, 400);
    }

    // Check expiry
    if (new Date(row.expires_at) < new Date()) {
      return c.json({ success: false, error: "Link ist abgelaufen" }, 400);
    }

    // Mark token as used
    await c.env.DB.prepare("UPDATE magic_link_tokens SET used = 1 WHERE token = ?")
      .bind(token)
      .run();

    // Create or get user
    let user = await c.env.DB.prepare(
      "SELECT id, email, role FROM users WHERE email = ? AND deleted_at IS NULL"
    )
      .bind(row.email)
      .first<{ id: string; email: string; role: string }>();

    let userRole = roleFromUrl || "unternehmen";

    if (!user) {
      // Create new user
      const userId = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, salt, hash_version, first_name, last_name, role, email_verified, onboarding_completed, created_at, updated_at)
         VALUES (?, ?, '', '', 0, '', '', ?, 1, 0, datetime('now'), datetime('now'))`
      )
        .bind(userId, row.email, userRole)
        .run();

      user = { id: userId, email: row.email, role: userRole };
    } else {
      userRole = user.role;
      // Ensure email is verified
      await c.env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?")
        .bind(user.id)
        .run();
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    await c.env.SESSIONS.put(
      `session:${sessionToken}`,
      JSON.stringify({ userId: user.id, email: user.email, role: userRole }),
      { expirationTtl: 604800 } // 7 days
    );

    // Redirect to frontend callback
    const callbackUrl = `${c.env.FRONTEND_URL}/api/auth/magic-link/callback?token=${sessionToken}`;
    return c.redirect(callbackUrl, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return c.json({ success: false, error: message }, 500);
  }
});

export { magicLink };
