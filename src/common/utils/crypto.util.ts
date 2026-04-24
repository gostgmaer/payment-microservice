/**
 * Cryptographic utilities
 *
 * Uses Node's built-in `crypto` module — no external dependencies.
 * All secrets must come from environment variables, never hardcoded.
 */

import { createHash, createHmac, timingSafeEqual, randomBytes } from 'crypto';

/**
 * Hash an idempotency key with SHA-256 before storing in DB.
 * This prevents the raw key from leaking in query logs.
 */
export function hashIdempotencyKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify a webhook HMAC-SHA256 signature.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyHmacSignature(
  payload: Buffer | string,
  secret: string,
  receivedSignature: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
): boolean {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const expected = createHmac(algorithm, secret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(receivedSignature);

  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Generate a cryptographically secure random nonce.
 * Used for replay-attack prevention.
 */
export function generateNonce(byteLength = 16): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Generate a secure, URL-safe idempotency key.
 */
export function generateIdempotencyKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Create an HMAC-SHA256 signature for outbound webhook delivery
 * (used in reconciliation callbacks).
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
