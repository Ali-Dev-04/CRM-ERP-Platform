import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema';

/**
 * Strongly-typed, validated configuration. One instance app-wide.
 * Validation runs in the factory (config.module.ts) so by the time anything
 * injects this, the config is guaranteed well-formed.
 */
@Injectable()
export class ConfigService {
  private readonly env: Env;

  constructor(raw: NodeJS.ProcessEnv = process.env) {
    const parsed = envSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      console.error(`Invalid environment configuration:\n${issues}`);
      throw new Error('Invalid environment configuration');
    }
    this.env = parsed.data;
  }

  get isProd(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isDev(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get value(): Env {
    return this.env;
  }

  static create(): ConfigService {
    return new ConfigService();
  }
}
