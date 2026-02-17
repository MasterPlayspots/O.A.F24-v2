// Password Hashing Service - PBKDF2 (v2) + legacy SHA-256 (v1)

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = generateSalt()
  const hash = await derivePbkdf2(password, salt)
  return { hash, salt }
}

export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const hash = await derivePbkdf2(password, salt)
  return timeSafeCompare(hash, storedHash)
}

export async function verifyLegacySha256(password: string, storedHash: string, jwtSecret: string): Promise<boolean> {
  const data = new TextEncoder().encode(password + jwtSecret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const computed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  return timeSafeCompare(computed, storedHash)
}

async function derivePbkdf2(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timeSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = new TextEncoder().encode(a)
  const bufB = new TextEncoder().encode(b)
  let result = 0
  for (let i = 0; i < bufA.length; i++) result |= bufA[i] ^ bufB[i]
  return result === 0
}
