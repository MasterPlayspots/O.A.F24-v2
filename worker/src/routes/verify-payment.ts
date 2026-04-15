// Verify Payment Route - POST /api/verify-payment
// Status check endpoint called by frontend after Stripe/PayPal redirect.
// For Stripe: reads existing payment state (webhook should have processed it).
// For PayPal: captures order if not yet captured (fallback), then returns status.
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { capturePayPalOrder } from "../services/paypal";
import { createDownloadToken } from "../services/download";

const verifyPayment = new Hono<{ Bindings: Bindings; Variables: Variables }>();

verifyPayment.post("/verify-payment", async (c) => {
  const body = await c.req.json<{
    sessionId?: string;
    paymentId?: string;
    payerId?: string;
    reportId?: string;
    provider?: "stripe" | "paypal";
  }>();

  const { provider, reportId } = body;
  if (!reportId || !provider) {
    return c.json({ success: false, error: "reportId and provider required" }, 400);
  }

  const db = c.env.DB;
  const bafaDb = c.env.BAFA_DB;

  // --- Stripe: look up by session_id ---
  if (provider === "stripe") {
    const { sessionId } = body;
    if (!sessionId) return c.json({ success: false, error: "sessionId required for stripe" }, 400);

    const payment = await db
      .prepare(
        "SELECT id, status, report_id FROM payments WHERE provider_payment_id = ? AND provider = 'stripe'"
      )
      .bind(sessionId)
      .first<{ id: string; status: string; report_id: string }>();

    if (!payment) {
      return c.json({ success: false, error: "Payment not found" }, 404);
    }

    if (payment.status === "completed") {
      const tokenRow = await bafaDb
        .prepare(
          "SELECT token FROM download_tokens WHERE antrag_id = ? AND gueltig_bis > datetime('now') ORDER BY erstellt_am DESC LIMIT 1"
        )
        .bind(payment.report_id)
        .first<{ token: string }>();

      const report = await db
        .prepare("SELECT company_name FROM reports WHERE id = ?")
        .bind(payment.report_id)
        .first<{ company_name: string | null }>();

      return c.json({
        success: true,
        reportId: payment.report_id,
        reportTitle: report?.company_name || "Beratungsbericht",
        downloadToken: tokenRow?.token || null,
      });
    }

    // Webhook hasn't processed yet
    return c.json({ success: false, error: "Payment pending", status: payment.status }, 202);
  }

  // --- PayPal: capture if needed, then return status ---
  if (provider === "paypal") {
    const { paymentId, payerId } = body;
    if (!paymentId || !payerId) {
      return c.json({ success: false, error: "paymentId and PayerID required for paypal" }, 400);
    }

    const payment = await db
      .prepare(
        "SELECT id, status, report_id, amount FROM payments WHERE provider_payment_id = ? AND provider = 'paypal'"
      )
      .bind(paymentId)
      .first<{ id: string; status: string; report_id: string; amount: number }>();

    if (!payment) {
      return c.json({ success: false, error: "Payment not found" }, 404);
    }

    if (payment.status === "completed") {
      const tokenRow = await bafaDb
        .prepare(
          "SELECT token FROM download_tokens WHERE antrag_id = ? AND gueltig_bis > datetime('now') ORDER BY erstellt_am DESC LIMIT 1"
        )
        .bind(payment.report_id)
        .first<{ token: string }>();

      const report = await db
        .prepare("SELECT company_name FROM reports WHERE id = ?")
        .bind(payment.report_id)
        .first<{ company_name: string | null }>();

      return c.json({
        success: true,
        reportId: payment.report_id,
        reportTitle: report?.company_name || "Beratungsbericht",
        downloadToken: tokenRow?.token || null,
      });
    }

    // Not yet captured — attempt capture (fallback if webhook didn't fire)
    try {
      const capture = await capturePayPalOrder(
        c.env.PAYPAL_CLIENT_ID,
        c.env.PAYPAL_CLIENT_SECRET,
        paymentId
      );

      if (capture.status === "COMPLETED") {
        const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
        if (capturedAmount) {
          const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100);
          if (capturedCents !== payment.amount) {
            return c.json({ success: false, error: "Amount mismatch" }, 400);
          }
        }

        await db.batch([
          db.prepare("UPDATE payments SET status = 'completed' WHERE id = ?").bind(payment.id),
          db
            .prepare("UPDATE reports SET is_unlocked=1, unlock_payment_id=? WHERE id=?")
            .bind(paymentId, payment.report_id),
        ]);
        await bafaDb
          .prepare(
            "UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?"
          )
          .bind(payment.report_id)
          .run();

        const { token: dlToken } = await createDownloadToken(bafaDb, payment.report_id);

        const report = await db
          .prepare("SELECT company_name FROM reports WHERE id = ?")
          .bind(payment.report_id)
          .first<{ company_name: string | null }>();

        return c.json({
          success: true,
          reportId: payment.report_id,
          reportTitle: report?.company_name || "Beratungsbericht",
          downloadToken: dlToken,
        });
      }

      return c.json(
        { success: false, error: "PayPal capture not completed", status: capture.status },
        400
      );
    } catch {
      return c.json({ success: false, error: "PayPal capture failed" }, 500);
    }
  }

  return c.json({ success: false, error: "Unknown provider" }, 400);
});

export { verifyPayment };
