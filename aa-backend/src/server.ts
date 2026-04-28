import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { env } from "@config/env";
import { logger } from "@infra/logger";
import { connectDB, disconnectDB } from "@infra/db";
import { redis } from "@infra/cache";
import { startWorker } from "@infra/queue";
import { errorHandler } from "@utils/errorHandler";
import { genRequestId } from "@utils/requestId";
import { aaRoutes } from "@modules/aa/aa.controller";
import { portfolioRoutes } from "@modules/portfolio/portfolio.controller";

// ─── App factory ──────────────────────────────────────────────────────────────

async function buildApp() {
  const app = Fastify({
    logger: false, // We use pino directly
    genReqId: genRequestId,
    trustProxy: true,
  });

  // ── Security ──
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production",
  });

  await app.register(cors, {
    origin: env.NODE_ENV === "production" ? false : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis,
    keyGenerator: (req) =>
      (req.headers["x-forwarded-for"] as string) ?? req.ip,
  });

  // ── Error handler ──
  app.setErrorHandler(errorHandler);

  // ── Health check ──
  app.get("/health", async (_req, reply) => {
    return reply.send({
      status: "ok",
      service: "aa-backend",
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  });

  // ── Routes ──
  await app.register(aaRoutes, { prefix: "/aa" });
  await app.register(portfolioRoutes, { prefix: "/portfolio" });

  return app;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main() {
  const app = await buildApp();

  // Connect infra
  await connectDB();
  await redis.connect();

  // Start BullMQ worker
  const worker = startWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    await app.close();
    await worker.close();
    await disconnectDB();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "AA backend started");
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
