const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#'

/**
 * Generates a cryptographically random 12-character password using the
 * same character set as the backend SecureRandom generator.
 * Uses window.crypto.getRandomValues — never Math.random().
 */
export function generatePassword(length = 12): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => CHARS[b % CHARS.length]).join('')
}
