import crypto from "crypto";
import type { FastifyRequest } from "fastify";

/**
 * Generates a request ID — uses the incoming header if present,
 * otherwise generates a new UUID.
 */
export function genRequestId(req: FastifyRequest): string {
  return (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
}
