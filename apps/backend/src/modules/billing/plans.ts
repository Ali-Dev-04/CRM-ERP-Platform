import type { OrganizationPlan } from '@prisma/client';

export interface PlanLimits {
  key: OrganizationPlan;
  label: string;
  tagline: string;
  /** Monthly price in cents; null = custom/contact sales. */
  priceMonthlyCents: number | null;
  /** null = unlimited */
  maxMembers: number | null;
  maxAiCalls: number | null;
  maxStorageBytes: number | null;
  /** Sorted display order on the pricing grid. */
  order: number;
  highlight?: boolean;
}

const GB = 1024 * 1024 * 1024;

/**
 * Single source of truth for what each plan allows. The Organization.plan
 * enum selects one of these; UsageService enforces them.
 */
export const PLAN_LIMITS: Record<OrganizationPlan, PlanLimits> = {
  FREE: {
    key: 'FREE',
    label: 'Free',
    tagline: 'For trying things out',
    priceMonthlyCents: 0,
    maxMembers: 3,
    maxAiCalls: 50,
    maxStorageBytes: 1 * GB,
    order: 0,
  },
  STARTUP: {
    key: 'STARTUP',
    label: 'Startup',
    tagline: 'For growing teams',
    priceMonthlyCents: 2900, // $29/mo
    maxMembers: 15,
    maxAiCalls: 500,
    maxStorageBytes: 10 * GB,
    order: 1,
    highlight: true,
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    label: 'Enterprise',
    tagline: 'Unlimited, with support',
    priceMonthlyCents: null,
    maxMembers: null,
    maxAiCalls: null,
    maxStorageBytes: null,
    order: 2,
  },
};

export const PLANS_ORDERED: PlanLimits[] = Object.values(PLAN_LIMITS).sort((a, b) => a.order - b.order);
