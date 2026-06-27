import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PGHOST: z.string().default("localhost"),
  PGPORT: z.coerce.number().default(5432),
  PGUSER: z.string().default("postgres"),
  PGPASSWORD: z.string().default("postgres"),
  PGDATABASE: z.string().default("smart_rate_limiter"),
});

export const env = envSchema.parse(process.env);
