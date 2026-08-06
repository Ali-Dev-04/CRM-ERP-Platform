import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end auth flow against a real database (provided by CI services or
 * local docker-compose). Skips itself when no DATABASE_URL is configured so
 * `npm run test:e2e` degrades gracefully on a bare machine.
 */
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@crm.dev`;
  const password = 'E2eStrongPass1';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.membership.deleteMany({ where: { userId: user.id } });
      await prisma.workspace.deleteMany({ where: { organization: { ownerId: user.id } } });
      await prisma.organization.deleteMany({ where: { ownerId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it('registers, logs in, reads /me, refreshes, and logs out', async () => {
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'User', organizationName: 'E2E Org' })
      .expect(201);
    expect(register.body.accessToken).toBeTruthy();
    expect(register.body.refreshToken).toBeTruthy();
    expect(register.body.user.email).toBe(email);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(email);

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(200);
  });

  it('rejects wrong credentials with a generic error', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'WrongPassword99' })
      .expect(401);
    expect(res.body.code).toBe('auth.invalid_credentials');
  });

  it('blocks org access without membership', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    await request(app.getHttpServer())
      .get('/organizations/000000000000000000000000')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});
