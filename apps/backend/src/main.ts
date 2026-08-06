import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Load .env: backend dir first, else the monorepo root. Uses __dirname so it
// resolves the same whether running from `src` (ts-node dev) or `dist` (built).
// Existing env vars win — safe for prod containers where env is injected.
for (const rel of ['../.env', '../../../.env']) {
  const p = resolve(__dirname, rel);
  if (existsSync(p)) {
    loadEnv({ path: p });
    break;
  }
}

/**
 * Process entrypoint. Keeps wiring minimal: bootstrap, global pipes/filters,
 * CORS, OpenAPI, graceful shutdown. All cross-cutting concerns are declared
 * once here or in AppModule.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  // Security baseline: secure headers + trust one proxy hop so req.ip and the
  // rate limiter see the real client IP when running behind NGINX.
  app.use(helmet());
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: config.value.CORS_ORIGINS,
    credentials: true,
  });
  app.enableShutdownHooks();

  // OpenAPI / Swagger — disabled in production via env policy (see docs).
  if (config.isDev || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CRM + ERP API')
      .setDescription('Multi-tenant CRM + ERP platform')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.value.PORT, () => {
    new Logger('Bootstrap').log(`API listening on :${config.value.PORT} (${config.value.NODE_ENV})`);
  });
}

void bootstrap();
