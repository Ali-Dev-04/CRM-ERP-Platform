import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

interface Readiness {
  status: 'ok' | 'degraded';
  checks: Record<string, { status: 'ok' | 'fail'; latencyMs?: number; error?: string }>;
}

/**
 * Liveness: the process is up (used by orchestrators for restart decisions).
 * Readiness: dependencies are reachable (used to gate traffic routing).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB + Redis)' })
  async ready(): Promise<Readiness> {
    const checks: Readiness['checks'] = {};

    checks.database = await this.timeCheck(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });

    checks.redis = await this.timeCheck(async () => {
      const pong = (await this.redis.ping()) as string;
      if (pong !== 'PONG') throw new Error(`unexpected redis reply: ${pong}`);
    });

    const allOk = Object.values(checks).every((c) => c.status === 'ok');
    return { status: allOk ? 'ok' : 'degraded', checks };
  }

  private async timeCheck(fn: () => Promise<void>): Promise<{ status: 'ok' | 'fail'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await fn();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return { status: 'fail', error: (err as Error).message, latencyMs: Date.now() - start };
    }
  }
}
