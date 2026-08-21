import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { Usage } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PLAN_LIMITS } from './plans';

const ErrorName = 'billing.quota_exceeded';

/** Thrown when an action would exceed the organization's plan limits. */
export class QuotaExceededError extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorName, message, HttpStatus.PAYMENT_REQUIRED, details);
  }
}

function startOfMonth(d = new Date()): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Meters per-organization usage (AI calls, tokens, storage) against the
 * organization's plan. Counters reset lazily: reading usage in a new billing
 * month zeroes it — no cron needed.
 */
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current-period usage row (created/reset on demand). */
  async getUsage(organizationId: string): Promise<Usage> {
    let usage = await this.prisma.usage.findUnique({ where: { organizationId } });
    const period = startOfMonth();
    if (!usage) {
      usage = await this.prisma.usage.create({
        data: { organizationId, periodStart: period },
      });
    } else if (usage.periodStart < period) {
      // New billing month — reset counters lazily.
      usage = await this.prisma.usage.update({
        where: { id: usage.id },
        data: { periodStart: period, aiCalls: 0, aiTokensUsed: 0 },
      });
    }
    return usage;
  }

  // ── AI ─────────────────────────────────────────────────────────────────────

  /** Throws QuotaExceededError if the org is out of AI runs this month. */
  async assertAiQuota(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { plan: true },
    });
    const limit = PLAN_LIMITS[org.plan].maxAiCalls;
    if (limit === null) return;
    const usage = await this.getUsage(organizationId);
    if (usage.aiCalls >= limit) {
      throw new QuotaExceededError(
        `Monthly AI limit reached (${usage.aiCalls}/${limit} runs on the ${PLAN_LIMITS[org.plan].label} plan). Upgrade to continue using AI.`,
        { limit, used: usage.aiCalls, plan: org.plan, resource: 'ai' },
      );
    }
  }

  /** Record one AI run (call after a successful gateway response). */
  async recordAiCall(organizationId: string, tokensUsed = 0): Promise<void> {
    const usage = await this.getUsage(organizationId);
    await this.prisma.usage.update({
      where: { id: usage.id },
      data: { aiCalls: { increment: 1 }, aiTokensUsed: { increment: tokensUsed } },
    });
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  /** Throws if storing `additionalBytes` would exceed the plan's storage cap. */
  async assertStorageQuota(organizationId: string, additionalBytes: bigint | number): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { plan: true },
    });
    const limit = PLAN_LIMITS[org.plan].maxStorageBytes;
    if (limit === null) return;
    const usage = await this.getUsage(organizationId);
    if (usage.storageBytes + BigInt(additionalBytes) > BigInt(limit)) {
      throw new QuotaExceededError(
        `Storage limit exceeded on the ${PLAN_LIMITS[org.plan].label} plan. Upgrade for more space.`,
        { limitBytes: limit, usedBytes: usage.storageBytes.toString(), resource: 'storage' },
      );
    }
  }

  async addStorage(organizationId: string, bytes: bigint | number): Promise<void> {
    const usage = await this.getUsage(organizationId);
    await this.prisma.usage.update({
      where: { id: usage.id },
      data: { storageBytes: { increment: BigInt(bytes) } },
    });
  }

  async removeStorage(organizationId: string, bytes: bigint | number): Promise<void> {
    const usage = await this.getUsage(organizationId);
    await this.prisma.usage.update({
      where: { id: usage.id },
      data: { storageBytes: { decrement: BigInt(bytes) } },
    });
  }

  // ── Seats ──────────────────────────────────────────────────────────────────

  /** Throws if inviting another member would exceed the plan's seat count. */
  async assertSeatQuota(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { plan: true },
    });
    const limit = PLAN_LIMITS[org.plan].maxMembers;
    if (limit === null) return;
    const count = await this.prisma.membership.count({ where: { organizationId } });
    if (count >= limit) {
      throw new QuotaExceededError(
        `Seat limit reached (${count}/${limit} members on the ${PLAN_LIMITS[org.plan].label} plan). Upgrade to invite more teammates.`,
        { limit, used: count, plan: org.plan, resource: 'seats' },
      );
    }
  }

  /** Aggregated usage + limits snapshot for the billing page. */
  async getBillingOverview(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { plan: true },
    });
    const [usage, memberCount] = await Promise.all([
      this.getUsage(organizationId),
      this.prisma.membership.count({ where: { organizationId } }),
    ]);
    const limits = PLAN_LIMITS[org.plan];
    return {
      plan: org.plan,
      limits,
      memberCount,
      usage: {
        aiCalls: usage.aiCalls,
        aiTokensUsed: usage.aiTokensUsed,
        storageBytes: usage.storageBytes.toString(), // BigInt → string (JSON-safe)
        periodStart: usage.periodStart,
      },
    };
  }
}
