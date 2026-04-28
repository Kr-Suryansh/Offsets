import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  // Prevent multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

prisma.$on("error" as never, (e: unknown) => {
  logger.error({ err: e }, "Prisma error");
});

prisma.$on("warn" as never, (e: unknown) => {
  logger.warn({ event: e }, "Prisma warning");
});

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info("PostgreSQL connected via Prisma");
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
}
