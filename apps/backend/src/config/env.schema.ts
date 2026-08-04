import { z } from 'zod';

/**
 * Single source of truth for environment shape. Validated once at bootstrap.
 * If a required variable is missing/invalid the app refuses to start — fail
 * loud, never run misconfigured in production.
 */
const intString = z.coerce.number().int().positive();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intString.default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: intString.default(900), // seconds
  JWT_REFRESH_TTL: intString.default(2_592_000), // 30 days
  PASSWORD_MIN_LENGTH: intString.default(12),

  CORS_ORIGINS: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .default('http://localhost:3000'),

  RATE_LIMIT_TTL: intString.default(60),
  RATE_LIMIT_LIMIT: intString.default(120),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('crm-erp-files'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  AI_API_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
