import { Injectable } from '@nestjs/common';
import { OrganizationPlan } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { UsageService } from './usage.service';
import { ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PLAN_LIMITS, PLANS_ORDERED } from './plans';

/**
 * Plan management: read the org's billing snapshot and change plans.
 * (Checkout is intentionally a mock — swap in Stripe here later; the
 * plan-change API shape stays the same.)
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {}

  async getOverview(actorId: string, organizationId: string) {
    await this.organizations.requireMembership(actorId, organizationId);
    return this.usage.getBillingOverview(organizationId);
  }

  /** Available plans (for the pricing grid). */
  listPlans() {
    return { plans: PLANS_ORDERED };
  }

  /**
   * Change the organization's plan. Mock checkout: succeeds immediately.
   * Downgrading below current usage is allowed — new usage is simply blocked
   * until the org is back under the limits.
   */
  async changePlan(actorId: string, organizationId: string, plan: OrganizationPlan) {
    await this.organizations.requireMembership(actorId, organizationId);
    if (!PLAN_LIMITS[plan]) {
      throw new ValidationError(ErrorCodes.VALIDATION, `Unknown plan: ${plan}`);
    }
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'billing.plan_change',
        targetType: 'organization',
        targetId: organizationId,
        metadata: { plan },
      })
      .catch(() => undefined);
    return { id: org.id, plan: org.plan };
  }
}
