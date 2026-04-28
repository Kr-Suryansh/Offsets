/**
 * crypto.service.js
 * AES-256-CBC encrypt/decrypt for sensitive values stored in DB.
 * Key loaded from ENCRYPTION_KEY env var (32 UTF-8 chars = 256 bits).
 */
const crypto = require('crypto');

const ALGO = 'aes-256-cbc';

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
  }
  return Buffer.from(key, 'utf-8');
}

/**
 * Encrypts plaintext → "iv_hex:ciphertext_hex"
 */
exports.encrypt = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypts "iv_hex:ciphertext_hex" → plaintext
 */
exports.decrypt = (stored) => {
  const [ivHex, encHex] = stored.split(':');
  if (!ivHex || !encHex) throw new Error('Invalid encrypted format');
  const decipher = crypto.createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivHex, 'hex')
  );
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf-8');
};

/**
 * Returns last 4 chars masked: "••••••••••••abcd"
 */
exports.maskToken = (token) => {
  if (!token || token.length < 4) return '••••';
  return '••••••••••••' + token.slice(-4);
};
