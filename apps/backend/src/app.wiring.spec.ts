import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { REDIS_CLIENT } from './infrastructure/redis/redis.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RbacBootstrapService } from './modules/rbac/rbac-bootstrap.service';

/**
 * Wiring smoke test: boots the entire AppModule with the DB and Redis
 * providers stubbed out. Proves the dependency-injection graph is valid
 * (no circular deps, every provider resolves), the global pipeline
 * (pipe → guards → filter) is wired, public routes bypass auth, and
 * protected routes reject without credentials. The real DB e2e flow
 * lives in test/auth.e2e-spec.ts (runs in CI with Postgres+Redis).
 */
describe('AppModule wiring (no DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET = 'x'.repeat(48);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(48);
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $transaction: jest.fn(async (x: unknown) => x) })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ ping: jest.fn().mockResolvedValue('PONG'), quit: jest.fn() })
      .overrideProvider(RbacBootstrapService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the public liveness probe', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rejects a protected route without a token (JwtAuthGuard is active)', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.body.code).toBe('auth.token_invalid');
  });

  it('validates input via the global ValidationPipe', async () => {
    // Missing required fields → 400 from ValidationPipe (a Nest HttpException).
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email' })
      .expect(400);
    expect(res.body).toBeTruthy();
  });

  it('exposes the API error envelope shape', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('path', '/auth/me');
  });
});
