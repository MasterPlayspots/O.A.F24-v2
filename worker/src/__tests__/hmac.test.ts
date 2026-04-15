// HMAC Service Tests - Signing, verification, Stripe webhook
import { describe, it, expect } from 'vitest'
import { generateHmacSignature, verifyHmacSignature, verifyStripeSignature } from '../services/hmac'

describe('HMAC Service', () => {
  const SECRET = 'test-secret-key'

  describe('generateHmacSignature / verifyHmacSignature', () => {
    it('generates and verifies a valid signature', async () => {
      const sig = await generateHmacSignature('report-123', 'pay-456', 'stripe', SECRET)
      expect(sig).toBeTruthy()
      expect(sig.length).toBe(64) // SHA-256 = 64 hex chars

      const valid = await verifyHmacSignature('report-123', 'pay-456', 'stripe', sig, SECRET)
      expect(valid).toBe(true)
    })

    it('rejects tampered reportId', async () => {
      const sig = await generateHmacSignature('report-123', 'pay-456', 'stripe', SECRET)
      const valid = await verifyHmacSignature('report-999', 'pay-456', 'stripe', sig, SECRET)
      expect(valid).toBe(false)
    })

    it('rejects tampered paymentId', async () => {
      const sig = await generateHmacSignature('report-123', 'pay-456', 'stripe', SECRET)
      const valid = await verifyHmacSignature('report-123', 'pay-999', 'stripe', sig, SECRET)
      expect(valid).toBe(false)
    })

    it('rejects wrong provider', async () => {
      const sig = await generateHmacSignature('report-123', 'pay-456', 'stripe', SECRET)
      const valid = await verifyHmacSignature('report-123', 'pay-456', 'paypal', sig, SECRET)
      expect(valid).toBe(false)
    })

    it('rejects wrong secret', async () => {
      const sig = await generateHmacSignature('report-123', 'pay-456', 'stripe', SECRET)
      const valid = await verifyHmacSignature('report-123', 'pay-456', 'stripe', sig, 'wrong-secret')
      expect(valid).toBe(false)
    })
  })

  describe('verifyStripeSignature', () => {
    async function createStripeSignature(payload: string, secret: string, timestamp?: number) {
      const ts = timestamp || Math.floor(Date.now() / 1000)
      const enc = new TextEncoder()
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${payload}`))
      const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
      return `t=${ts},v1=${sigHex}`
    }

    it('accepts valid stripe signature', async () => {
      const payload = '{"type":"checkout.session.completed"}'
      const sigHeader = await createStripeSignature(payload, SECRET)
      const valid = await verifyStripeSignature(payload, sigHeader, SECRET)
      expect(valid).toBe(true)
    })

    it('rejects expired timestamp', async () => {
      const payload = '{"type":"checkout.session.completed"}'
      const oldTs = Math.floor(Date.now() / 1000) - 600 // 10 min ago (tolerance is 5 min)
      const sigHeader = await createStripeSignature(payload, SECRET, oldTs)
      const valid = await verifyStripeSignature(payload, sigHeader, SECRET)
      expect(valid).toBe(false)
    })

    it('rejects tampered payload', async () => {
      const sigHeader = await createStripeSignature('original', SECRET)
      const valid = await verifyStripeSignature('tampered', sigHeader, SECRET)
      expect(valid).toBe(false)
    })

    it('rejects missing signature header parts', async () => {
      const valid = await verifyStripeSignature('payload', 'invalid-header', SECRET)
      expect(valid).toBe(false)
    })
  })
})
