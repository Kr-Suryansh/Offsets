/**
 * aa.crypto.ts
 *
 * Handles the AA encryption scheme:
 *   - ECDH key exchange on Curve25519 (X25519)
 *   - AES-256-GCM decryption of FI data
 *   - RSA-OAEP for token encryption at rest
 *
 * Keys are NEVER hardcoded — loaded from env via config/env.ts
 */

import crypto from "crypto";
import { env } from "@config/env";
import { AppError } from "@types/common.types";
import type { AAKeyMaterial } from "@types/aa.types";

// ─── Key loading ──────────────────────────────────────────────────────────────

function loadPrivateKey(): crypto.KeyObject {
  const pem = Buffer.from(env.AA_PRIVATE_KEY_B64, "base64").toString("utf-8");
  return crypto.createPrivateKey({ key: pem, format: "pem" });
}

function loadPublicKey(): crypto.KeyObject {
  const pem = Buffer.from(env.AA_PUBLIC_KEY_B64, "base64").toString("utf-8");
  return crypto.createPublicKey({ key: pem, format: "pem" });
}

// ─── ECDH shared secret derivation ───────────────────────────────────────────

/**
 * Derives a shared AES key using ECDH (X25519).
 * The AA provider sends their ephemeral public key in KeyMaterial.
 */
function deriveSharedSecret(
  ourPrivateKey: crypto.KeyObject,
  theirPublicKeyB64: string
): Buffer {
  const theirPublicKey = crypto.createPublicKey({
    key: Buffer.from(theirPublicKeyB64, "base64"),
    format: "der",
    type: "spki",
  });

  const sharedSecret = crypto.diffieHellman({
    privateKey: ourPrivateKey,
    publicKey: theirPublicKey,
  });

  // HKDF to derive a 32-byte AES key from the raw shared secret
  return crypto.hkdfSync(
    "sha256",
    sharedSecret,
    Buffer.alloc(0),   // salt (empty per ReBIT spec)
    Buffer.from("AA-FI-DATA", "utf-8"),
    32
  );
}

// ─── AES-256-GCM decryption ───────────────────────────────────────────────────

/**
 * Decrypts a single encrypted FI data blob from the AA provider.
 *
 * @param encryptedFI  Base64-encoded ciphertext (IV prepended, 12 bytes)
 * @param keyMaterial  KeyMaterial block from the AA response
 * @returns            Decrypted JSON string of the FI document
 */
export function decryptFIData(
  encryptedFI: string,
  keyMaterial: AAKeyMaterial
): string {
  try {
    const privateKey = loadPrivateKey();
    const aesKey = deriveSharedSecret(
      privateKey,
      keyMaterial.DHPublicKey.KeyValue
    );

    const cipherBuf = Buffer.from(encryptedFI, "base64");

    // ReBIT spec: first 12 bytes = IV/nonce, last 16 bytes = auth tag
    const IV_LENGTH = 12;
    const TAG_LENGTH = 16;

    if (cipherBuf.length < IV_LENGTH + TAG_LENGTH) {
      throw new AppError("Encrypted FI data too short", 422, "DECRYPT_ERROR");
    }

    const iv = cipherBuf.subarray(0, IV_LENGTH);
    const tag = cipherBuf.subarray(cipherBuf.length - TAG_LENGTH);
    const ciphertext = cipherBuf.subarray(IV_LENGTH, cipherBuf.length - TAG_LENGTH);

    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "Failed to decrypt FI data",
      422,
      "DECRYPT_ERROR"
    );
  }
}

// ─── Token encryption at rest (AES-256-CBC) ───────────────────────────────────

const ALGO = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "utf-8");
}

/**
 * Encrypts a plaintext string for storage in the database.
 * Returns a hex string: iv:ciphertext
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a token previously encrypted with encryptToken().
 */
export function decryptToken(stored: string): string {
  const [ivHex, encHex] = stored.split(":");
  if (!ivHex || !encHex) {
    throw new AppError("Invalid encrypted token format", 500, "TOKEN_DECRYPT_ERROR");
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf-8");
}

// ─── Webhook HMAC verification ────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature on incoming AA webhook payloads.
 * Constant-time comparison prevents timing attacks.
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string
): boolean {
  const expected = crypto
    .createHmac("sha256", env.AA_WEBHOOK_SECRET)
    .update(rawBody, "utf-8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(receivedSignature.replace(/^sha256=/, ""), "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ─── Key generation helper (run once during setup) ───────────────────────────

/**
 * Generates an X25519 key pair for AA integration.
 * Call this once and store the base64-encoded PEMs in your env.
 */
export function generateAAKeyPair(): { privateKeyB64: string; publicKeyB64: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519");
  return {
    privateKeyB64: privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString()
      .split("")
      .map((c) => c.charCodeAt(0))
      .reduce((acc, b) => acc + String.fromCharCode(b), ""),
    publicKeyB64: publicKey
      .export({ type: "spki", format: "pem" })
      .toString()
      .split("")
      .map((c) => c.charCodeAt(0))
      .reduce((acc, b) => acc + String.fromCharCode(b), ""),
  };
}
