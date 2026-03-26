// Payment Routes - Stripe + PayPal
// Uses BAFA_DB for antrag status updates and download tokens
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { AUDIT_EVENTS, REPORT_PRICE_CENTS } from "../types";
import { requireAuth } from "../middleware/auth";
import { createCheckoutSession } from "../services/stripe";
import { createPayPalOrder, capturePayPalOrder } from "../services/paypal";
import { verifyStripeSignature } from "../services/hmac";
import { writeAuditLog } from "../services/audit";
import { createDownloadToken } from "../services/download";
import { validateAndApplyPromo } from "../services/promo";
import * as ReportRepo from "../repositories/report.repository";
import * as OrderRepo from "../repositories/order.repository";

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /stripe/create-session
payments.post("/stripe/create-session", requireAuth, async (c) => {
  const parsed = z
    .object({ reportId: z.string().uuid(), promoCode: z.string().optional() })
    .safeParse(await c.req.json());
  if (!parsed.success) return c.json({ success: false, error: "Ungültige Anfrage" }, 400);
  const { reportId, promoCode } = parsed.data;
  const user = c.get("user");
  const db = c.env.DB;

  // Verify ownership via zfbf-db reports table
  const report = await ReportRepo.findOwnershipForPayment(db, reportId, user.id);
  if (!report) return c.json({ success: false, error: "Bericht nicht gefunden" }, 404);

  // Get company name from BAFA_DB if available
  const antrag = await ReportRepo.findAntragName(c.env.BAFA_DB, reportId);
  const companyName = antrag?.unternehmen_name || report.company_name || "Beratungsbericht";

  let amount = REPORT_PRICE_CENTS;
  if (promoCode) {
    const promo = await validateAndApplyPromo(db, promoCode, amount);
    if (promo.valid) amount = promo.discountedAmount;
  }

  if (amount === 0) {
    await ReportRepo.unlockReport(db, reportId, "promo-free");
    await ReportRepo.updateAntragStatus(c.env.BAFA_DB, reportId, "bezahlt", { bezahlt: true });
    return c.json({ success: true, status: "free", message: "Bericht kostenlos freigeschaltet" });
  }

  try {
    const session = await createCheckoutSession(c.env.STRIPE_SECRET_KEY, {
      reportId,
      userId: user.id,
      amount,
      productName: `BAFA-Bericht: ${companyName}`,
      successUrl: "https://zfbf.info/payment/success?session={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://zfbf.info/payment/cancel",
      customerEmail: user.email,
    });
    await OrderRepo.createPayment(db, {
      id: crypto.randomUUID(),
      userId: user.id,
      reportId,
      packageType: "einzel",
      amount,
      provider: "stripe",
      providerPaymentId: session.id,
      gutscheinCode: promoCode,
      status: "pending",
    });
    return c.json({ success: true, sessionId: session.id, checkoutUrl: session.url });
  } catch {
    return c.json({ success: false, error: "Stripe Checkout konnte nicht erstellt werden" }, 500);
  }
});

// POST /stripe/webhook
payments.post("/stripe/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 400);
  const payload = await c.req.text();
  if (!(await verifyStripeSignature(payload, sig, c.env.STRIPE_WEBHOOK_SECRET)))
    return c.json({ error: "Invalid signature" }, 403);

  const event = JSON.parse(payload);
  const eventKey = `stripe:${event.id}`;
  if (await c.env.WEBHOOK_EVENTS.get(eventKey)) return c.json({ received: true, duplicate: true });
  await c.env.WEBHOOK_EVENTS.put(eventKey, "1", { expirationTtl: 86400 });

  const db = c.env.DB;
  const bafaDb = c.env.BAFA_DB;
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const reportId = s.metadata?.reportId as string | undefined;
    const userId = s.metadata?.userId as string | undefined;
    if (reportId && userId) {
      // Verify paid amount matches stored order
      const storedPayment = await OrderRepo.findByProviderPaymentId(db, s.id);
      if (storedPayment) {
        const paidCents = s.amount_total as number | undefined;
        if (paidCents !== undefined && paidCents !== storedPayment.amount) {
          await writeAuditLog(db, {
            userId,
            eventType: AUDIT_EVENTS.PAYMENT,
            detail: `Amount mismatch: paid ${paidCents} vs expected ${storedPayment.amount} for ${reportId}`,
          });
          return c.json({ received: true, error: "Amount mismatch" });
        }
      }
      await OrderRepo.updatePaymentStatus(db, s.id, "completed");
      await ReportRepo.unlockReport(db, reportId, s.id);
      await ReportRepo.updateAntragStatus(bafaDb, reportId, "bezahlt", { bezahlt: true });
      await createDownloadToken(bafaDb, reportId);
      await writeAuditLog(db, {
        userId,
        eventType: AUDIT_EVENTS.PAYMENT,
        detail: `Stripe ${s.id} for ${reportId}`,
      });
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const pay = await OrderRepo.findReportIdByProviderPaymentId(
      db,
      charge.payment_intent as string
    );
    if (pay?.report_id) {
      await ReportRepo.lockReport(db, pay.report_id);
      await OrderRepo.updatePaymentStatus(db, charge.payment_intent as string, "refunded");
      await ReportRepo.resetAntragPayment(bafaDb, pay.report_id);
    }
  }
  return c.json({ received: true });
});

// POST /paypal/create-order
payments.post("/paypal/create-order", requireAuth, async (c) => {
  const parsed = z
    .object({ reportId: z.string().uuid(), promoCode: z.string().optional() })
    .safeParse(await c.req.json());
  if (!parsed.success) return c.json({ success: false, error: "Ungültige Anfrage" }, 400);
  const { reportId } = parsed.data;
  const user = c.get("user");
  const db = c.env.DB;

  const report = await ReportRepo.findOwnershipForPayment(db, reportId, user.id);
  if (!report) return c.json({ success: false, error: "Bericht nicht gefunden" }, 404);

  const antrag = await ReportRepo.findAntragName(c.env.BAFA_DB, reportId);
  const companyName = antrag?.unternehmen_name || report.company_name || "Beratungsbericht";

  try {
    const order = await createPayPalOrder(c.env.PAYPAL_CLIENT_ID, c.env.PAYPAL_CLIENT_SECRET, {
      reportId,
      userId: user.id,
      amount: REPORT_PRICE_CENTS,
      description: `BAFA-Bericht: ${companyName}`,
    });
    await OrderRepo.createPayment(db, {
      id: crypto.randomUUID(),
      userId: user.id,
      reportId,
      packageType: "einzel",
      amount: REPORT_PRICE_CENTS,
      provider: "paypal",
      providerPaymentId: order.orderId,
      status: "pending",
    });
    return c.json({ success: true, orderId: order.orderId, approveUrl: order.approveUrl });
  } catch {
    return c.json({ success: false, error: "PayPal Order konnte nicht erstellt werden" }, 500);
  }
});

// POST /paypal/capture-order
payments.post("/paypal/capture-order", requireAuth, async (c) => {
  const { orderId } = await c.req.json();
  if (!orderId) return c.json({ success: false, error: "Order ID erforderlich" }, 400);
  const user = c.get("user");
  const db = c.env.DB;
  const bafaDb = c.env.BAFA_DB;
  try {
    const capture = await capturePayPalOrder(
      c.env.PAYPAL_CLIENT_ID,
      c.env.PAYPAL_CLIENT_SECRET,
      orderId
    );
    if (capture.status === "COMPLETED") {
      const pay = await OrderRepo.findByProviderPaymentId(db, orderId);
      if (pay) {
        // Verify captured amount matches expected
        const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
        if (capturedAmount) {
          const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100);
          if (capturedCents !== pay.amount) {
            return c.json({ success: false, error: "Betrag stimmt nicht überein" }, 400);
          }
        }
        await OrderRepo.updatePaymentStatusById(db, pay.id, "completed");
        await ReportRepo.unlockReport(db, pay.report_id, orderId);
        await ReportRepo.updateAntragStatus(bafaDb, pay.report_id, "bezahlt", { bezahlt: true });
        const { token: dlToken, validUntil } = await createDownloadToken(bafaDb, pay.report_id);
        await writeAuditLog(db, {
          userId: user.id,
          eventType: AUDIT_EVENTS.PAYMENT,
          detail: `PayPal ${orderId}`,
        });
        return c.json({ success: true, downloadToken: dlToken, expiresAt: validUntil });
      }
    }
    return c.json({ success: false, error: "Zahlung nicht abgeschlossen" }, 400);
  } catch {
    return c.json({ success: false, error: "PayPal Capture fehlgeschlagen" }, 500);
  }
});

export { payments };
