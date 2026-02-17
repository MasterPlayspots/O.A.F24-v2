// Password Service Tests - PBKDF2 hashing + legacy SHA-256 verification
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, verifyLegacySha256 } from '../services/password'

describe('Password Service', () => {
  describe('hashPassword', () => {
    it('returns hash and salt', async () => {
      const { hash, salt } = await hashPassword('TestPass123!')
      expect(hash).toBeTruthy()
      expect(salt).toBeTruthy()
      expect(hash.length).toBe(64) // 256 bits = 64 hex chars
      expect(salt.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('produces different salts for same password', async () => {
      const r1 = await hashPassword('SamePassword!')
      const r2 = await hashPassword('SamePassword!')
      expect(r1.salt).not.toBe(r2.salt)
      expect(r1.hash).not.toBe(r2.hash)
    })
  })

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const { hash, salt } = await hashPassword('MySecure#Pass1')
      const valid = await verifyPassword('MySecure#Pass1', hash, salt)
      expect(valid).toBe(true)
    })

    it('rejects wrong password', async () => {
      const { hash, salt } = await hashPassword('CorrectPass!')
      const valid = await verifyPassword('WrongPass!', hash, salt)
      expect(valid).toBe(false)
    })

    it('rejects empty password', async () => {
      const { hash, salt } = await hashPassword('CorrectPass!')
      const valid = await verifyPassword('', hash, salt)
      expect(valid).toBe(false)
    })
  })

  describe('verifyLegacySha256', () => {
    it('verifies legacy SHA-256 hash', async () => {
      const password = 'LegacyPass123'
      const secret = 'my-jwt-secret'
      // Manually compute SHA-256(password + secret)
      const data = new TextEncoder().encode(password + secret)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const legacyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      const valid = await verifyLegacySha256(password, legacyHash, secret)
      expect(valid).toBe(true)
    })

    it('rejects wrong password for legacy hash', async () => {
      const data = new TextEncoder().encode('correct' + 'secret')
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const legacyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      const valid = await verifyLegacySha256('wrong', legacyHash, 'secret')
      expect(valid).toBe(false)
    })
  })
})
