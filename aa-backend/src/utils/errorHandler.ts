import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { AppError } from "@types/common.types";
import { logger } from "@infra/logger";

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  req: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = req.id;

  // Known application error
  if (error instanceof AppError) {
    logger.warn({ requestId, code: error.code, statusCode: error.statusCode }, error.message);
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      code: error.code,
      requestId,
    });
    return;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    reply.status(400).send({
      success: false,
      error: "Validation failed",
      details: error.flatten().fieldErrors,
      requestId,
    });
    return;
  }

  // Fastify validation error (JSON schema)
  if ("validation" in error && error.validation) {
    reply.status(400).send({
      success: false,
      error: "Request validation failed",
      details: error.validation,
      requestId,
    });
    return;
  }

  // Unhandled — log full error but return generic message
  logger.error({ requestId, err: error }, "Unhandled error");
  reply.status(500).send({
    success: false,
    error: "Internal server error",
    requestId,
  });
}
