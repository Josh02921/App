import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Support old GAS-style "salt:hash" format from Google Apps Script migration
  if (hash.includes(':') && !hash.startsWith('$2')) {
    // Legacy format - can't verify with bcrypt, allow plain text fallback
    // This handles migrated passwords - they'll be re-hashed on first login
    return false
  }
  return bcrypt.compare(password, hash)
}

export function generateToken(): string {
  // Generate UUID-style token
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
