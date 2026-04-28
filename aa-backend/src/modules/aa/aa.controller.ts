/**
 * aa.controller.ts
 *
 * Fastify route handlers for the AA module.
 * Controllers are thin — validation + delegation to service only.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import * as aaService from "./aa.service";
import { logger } from "@infra/logger";
import { AppError } from "@types/common.types";

// ─── Validation schemas ───────────────────────────────────────────────────────

const createConsentSchema = z.object({
  userId: z.string().cuid(),
  mobile: z.string().regex(/^\d{10}@\w+$/, "Format: 9999999999@aa-handle"),
  fetchFrom: z.string().datetime(),
  fetchTo: z.string().datetime(),
});

const triggerFetchSchema = z.object({
  consentId: z.string().cuid(),
  fetchFrom: z.string().datetime().optional(),
  fetchTo: z.string().datetime().optional(),
});

// ─── Route registration ───────────────────────────────────────────────────────

export async function aaRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /aa/consent
   * Initiate a new consent request with the AA provider.
   */
  fastify.post("/consent", async (req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.id;
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

    const body = createConsentSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten().fieldErrors,
        requestId,
      });
    }

    const result = await aaService.createConsent({
      ...body.data,
      fetchFrom: new Date(body.data.fetchFrom),
      fetchTo: new Date(body.data.fetchTo),
      idempotencyKey,
    });

    logger.info({ requestId, consentId: result.consentId }, "Consent created via API");

    return reply.status(201).send({ success: true, data: result, requestId });
  });

  /**
   * GET /aa/consent/:id
   * Check the status of an existing consent.
   */
  fastify.get(
    "/consent/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const requestId = req.id;

      const result = await aaService.getConsentStatus(id);
      return reply.send({ success: true, data: result, requestId });
    }
  );

  /**
   * POST /aa/consent/callback
   * Webhook endpoint called by the AA provider when consent status changes.
   * Requires HMAC-SHA256 signature in x-jws-signature header.
   */
  fastify.post(
    "/consent/callback",
    {
      config: { rawBody: true }, // Fastify needs raw body for HMAC
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const signature = req.headers["x-jws-signature"] as string;
      const requestId = req.id;

      if (!signature) {
        return reply.status(401).send({
          success: false,
          error: "Missing signature",
          requestId,
        });
      }

      const rawBody =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);

      await aaService.handleConsentCallback(rawBody, signature);

      logger.info({ requestId }, "Consent callback processed");
      return reply.status(200).send({ success: true, requestId });
    }
  );

  /**
   * POST /aa/fetch
   * Trigger a data fetch session for an active consent.
   */
  fastify.post("/fetch", async (req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.id;

    // In production, userId comes from JWT middleware
    const userId = (req as FastifyRequest & { userId?: string }).userId;
    if (!userId) {
      return reply.status(401).send({ success: false, error: "Unauthorized", requestId });
    }

    const body = triggerFetchSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: body.error.flatten().fieldErrors,
        requestId,
      });
    }

    const result = await aaService.triggerDataFetch({
      consentId: body.data.consentId,
      userId,
      fetchFrom: body.data.fetchFrom ? new Date(body.data.fetchFrom) : undefined,
      fetchTo: body.data.fetchTo ? new Date(body.data.fetchTo) : undefined,
    });

    logger.info({ requestId, sessionId: result.sessionId }, "Data fetch triggered");
    return reply.status(202).send({ success: true, data: result, requestId });
  });
}
