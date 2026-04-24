"use strict";
/**
 * Cryptographic utilities
 *
 * Uses Node's built-in `crypto` module — no external dependencies.
 * All secrets must come from environment variables, never hardcoded.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashIdempotencyKey = hashIdempotencyKey;
exports.verifyHmacSignature = verifyHmacSignature;
exports.generateNonce = generateNonce;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.signPayload = signPayload;
var crypto_1 = require("crypto");
/**
 * Hash an idempotency key with SHA-256 before storing in DB.
 * This prevents the raw key from leaking in query logs.
 */
function hashIdempotencyKey(key) {
    return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
}
/**
 * Verify a webhook HMAC-SHA256 signature.
 * Uses timingSafeEqual to prevent timing attacks.
 */
function verifyHmacSignature(payload, secret, receivedSignature, algorithm) {
    if (algorithm === void 0) { algorithm = 'sha256'; }
    var body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    var expected = (0, crypto_1.createHmac)(algorithm, secret).update(body).digest('hex');
    var expectedBuf = Buffer.from(expected);
    var receivedBuf = Buffer.from(receivedSignature);
    if (expectedBuf.length !== receivedBuf.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expectedBuf, receivedBuf);
}
/**
 * Generate a cryptographically secure random nonce.
 * Used for replay-attack prevention.
 */
function generateNonce(byteLength) {
    if (byteLength === void 0) { byteLength = 16; }
    return (0, crypto_1.randomBytes)(byteLength).toString('hex');
}
/**
 * Generate a secure, URL-safe idempotency key.
 */
function generateIdempotencyKey() {
    return (0, crypto_1.randomBytes)(32).toString('base64url');
}
/**
 * Create an HMAC-SHA256 signature for outbound webhook delivery
 * (used in reconciliation callbacks).
 */
function signPayload(payload, secret) {
    return (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
}
