// Stripe Payment Service
import { z } from 'zod'

const CheckoutSessionResponse = z.object({ id: z.string(), url: z.string() })

export async function createCheckoutSession(secretKey: string, params: {
  reportId: string; userId: string; amount: number; productName: string;
  successUrl: string; cancelUrl: string; customerEmail?: string;
}): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams({
    'payment_method_types[]': 'card',
    mode: 'payment',
    currency: 'eur',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': params.amount.toString(),
    'line_items[0][price_data][product_data][name]': params.productName,
    'line_items[0][quantity]': '1',
    'metadata[reportId]': params.reportId,
    'metadata[userId]': params.userId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })
  if (params.customerEmail) body.set('customer_email', params.customerEmail)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`)
  return CheckoutSessionResponse.parse(await res.json())
}
