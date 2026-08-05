import { InjectQueue, OnQueueEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MAINTENANCE_QUEUE } from './queue.module';
import { TokenService } from '../../modules/auth/token.service';

const PRUNE_JOB = 'token-prune';
const EVERY_HOUR = '0 * * * *';

/**
 * Schedules and runs the expired-refresh-token prune job. The repeatable job
 * is registered idempotently on bootstrap; the worker executes it hourly.
 */
@Processor(MAINTENANCE_QUEUE)
export class TokenPruneProcessor extends WorkerHost {
  private readonly logger = new Logger(TokenPruneProcessor.name);

  constructor(
    @InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue,
    private readonly tokens: TokenService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Idempotent: BullMQ dedupes repeatable jobs by key (name + pattern).
    // Non-fatal: if Redis is unavailable at boot, the app still starts; the
    // worker will reconnect and the job registers on the next restart.
    try {
      await this.queue.add(
        PRUNE_JOB,
        {},
        { repeat: { pattern: EVERY_HOUR }, removeOnComplete: true, removeOnFail: 100 },
      );
      this.logger.log(`Scheduled '${PRUNE_JOB}' (${EVERY_HOUR})`);
    } catch (err) {
      this.logger.warn(`Could not schedule '${PRUNE_JOB}' (Redis unavailable?): ${(err as Error).message}`);
    }
  }

  async process(job: { name: string }): Promise<void> {
    if (job.name !== PRUNE_JOB) return;
    const removed = await this.tokens.pruneExpired();
    if (removed > 0) this.logger.log(`Pruned ${removed} expired refresh tokens`);
  }

  @OnQueueEvent('failed')
  onFailed({ job, err }: { job: { name: string }; err: Error }): void {
    this.logger.error(`Job '${job.name}' failed: ${err.message}`);
  }
}
