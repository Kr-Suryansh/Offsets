import Redis from "ioredis";
import { env } from "@config/env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis error"));
redis.on("close", () => logger.warn("Redis connection closed"));

// ─── Cache helpers ────────────────────────────────────────────────────────────

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

/**
 * Returns true if the key is new (first time seen).
 * Returns false if already processed → caller should return cached response.
 */
export async function acquireIdempotencyLock(
  key: string,
  ttlSeconds = 86_400 // 24 h
): Promise<boolean> {
  const result = await redis.set(
    `idempotency:${key}`,
    "1",
    "EX",
    ttlSeconds,
    "NX"
  );
  return result === "OK";
}

export async function getIdempotencyResult<T>(key: string): Promise<T | null> {
  return cacheGet<T>(`idempotency:result:${key}`);
}

export async function setIdempotencyResult(
  key: string,
  value: unknown,
  ttlSeconds = 86_400
): Promise<void> {
  await cacheSet(`idempotency:result:${key}`, value, ttlSeconds);
}
