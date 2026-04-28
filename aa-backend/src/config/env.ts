import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_SECRET: z.string().min(16),

  // Account Aggregator
  AA_BASE_URL: z.string().url(),
  AA_CLIENT_ID: z.string().min(1),
  AA_CLIENT_SECRET: z.string().min(1),
  AA_PRIVATE_KEY_B64: z.string().min(1),
  AA_PUBLIC_KEY_B64: z.string().min(1),
  AA_WEBHOOK_SECRET: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Encryption
  ENCRYPTION_KEY: z.string().length(32),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
