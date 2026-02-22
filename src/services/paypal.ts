// PayPal Payment Service

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json() as any
  return data.access_token
}

export async function createPayPalOrder(clientId: string, clientSecret: string, params: {
  reportId: string; userId: string; amount: number; description: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const token = await getAccessToken(clientId, clientSecret)
  const res = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: params.reportId, description: params.description, custom_id: `${params.userId}:${params.reportId}`, amount: { currency_code: 'EUR', value: (params.amount / 100).toFixed(2) } }],
      application_context: { brand_name: 'BAFA Creator AI', user_action: 'PAY_NOW', return_url: 'https://zfbf.info/payment/success?provider=paypal', cancel_url: 'https://zfbf.info/payment/cancel' },
    }),
  })
  if (!res.ok) throw new Error(`PayPal error: ${await res.text()}`)
  const order = await res.json() as any
  return { orderId: order.id, approveUrl: order.links?.find((l: any) => l.rel === 'approve')?.href || '' }
}

export async function capturePayPalOrder(clientId: string, clientSecret: string, orderId: string): Promise<any> {
  const token = await getAccessToken(clientId, clientSecret)
  const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('PayPal capture failed')
  return res.json()
}
