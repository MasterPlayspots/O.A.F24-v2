// HMAC-SHA256 Signing & Verification

export async function generateHmacSignature(reportId: string, paymentId: string, provider: string, secret: string): Promise<string> {
  return signHmac(`${reportId}:${paymentId}:${provider}`, secret)
}

export async function verifyHmacSignature(reportId: string, paymentId: string, provider: string, signature: string, secret: string): Promise<boolean> {
  const expected = await generateHmacSignature(reportId, paymentId, provider, secret)
  return timeSafeCompare(expected, signature)
}

async function signHmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyStripeSignature(payload: string, sigHeader: string, secret: string, tolerance = 300): Promise<boolean> {
  const parts = sigHeader.split(',')
  const ts = parts.find(e => e.startsWith('t='))?.slice(2)
  const sig = parts.find(e => e.startsWith('v1='))?.slice(3)
  if (!ts || !sig) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10)) > tolerance) return false
  const expected = await signHmac(`${ts}.${payload}`, secret)
  return timeSafeCompare(expected, sig)
}

function timeSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = new TextEncoder().encode(a)
  const bufB = new TextEncoder().encode(b)
  let result = 0
  for (let i = 0; i < bufA.length; i++) result |= bufA[i] ^ bufB[i]
  return result === 0
}
