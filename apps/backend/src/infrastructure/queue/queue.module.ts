import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import { TokenPruneProcessor } from './token-prune.processor';
import { AuthModule } from '../../modules/auth/auth.module';

export const MAINTENANCE_QUEUE = 'maintenance';

/**
 * Background jobs via BullMQ over Redis. Currently runs one repeating job —
 * pruning expired refresh tokens — as a concrete example of the pattern;
 * AI fan-out (M6) and notification dispatch reuse this queue.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: new Redis(config.value.REDIS_URL, { maxRetriesPerRequest: null }),
      }),
    }),
    BullModule.registerQueue({ name: MAINTENANCE_QUEUE }),
    AuthModule,
  ],
  providers: [TokenPruneProcessor],
  exports: [BullModule],
})
export class QueueModule {}
