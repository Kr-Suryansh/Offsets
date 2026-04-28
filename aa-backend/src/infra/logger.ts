import pino from "pino";
import { env } from "@config/env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  // Never log sensitive fields
  redact: {
    paths: [
      "req.headers.authorization",
      "body.accessToken",
      "body.privateKey",
      "*.accessTokenEnc",
      "*.AA_PRIVATE_KEY_B64",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: { service: "aa-backend", env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
