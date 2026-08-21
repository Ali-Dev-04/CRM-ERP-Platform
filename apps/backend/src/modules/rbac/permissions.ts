/**
 * Authoritative permission catalog. Format: "<domain>:<verb>".
 * Keys are stored verbatim in the DB and matched in guards — keep them stable.
 *
 * New modules declare their permissions here and add them to the relevant
 * system roles below; the seed/bootstrap ensures the DB stays in sync.
 */
export const PERMISSIONS = [
  // CRM
  'clients:read',
  'clients:write',
  'clients:delete',
  // Billing
  'invoices:read',
  'invoices:write',
  'invoices:delete',
  'quotations:read',
  'quotations:write',
  'payments:read',
  'payments:write',
  // Project management
  'projects:read',
  'projects:write',
  'projects:delete',
  'tasks:read',
  'tasks:write',
  'tasks:delete',
  'meetings:read',
  'meetings:write',
  // HR / ERP
  'employees:read',
  'employees:write',
  'attendance:read',
  'attendance:write',
  'leaves:read',
  'leaves:write',
  'assets:read',
  'assets:write',
  // Platform
  'documents:read',
  'documents:write',
  'reports:read',
  'analytics:read',
  'knowledge:read',
  'knowledge:write',
  'org:manage',
  'members:manage',
  'billing:manage',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

/**
 * System roles seeded for every organization. `organizationId = null` means
 * the role is shared (not per-org). Custom org roles are created later and
 * reference these names as templates.
 */
export const SYSTEM_ROLES = {
  OWNER: {
    name: 'Owner',
    permissions: ALL_PERMISSIONS,
  },
  ADMIN: {
    name: 'Admin',
    // Admin gets everything except org ownership and billing (the account
    // holder's domain): org:manage + billing:manage stay Owner-only.
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'org:manage' && p !== 'billing:manage'),
  },
  MEMBER: {
    name: 'Member',
    permissions: [
      'clients:read',
      'projects:read',
      'projects:write',
      'tasks:read',
      'tasks:write',
      'meetings:read',
      'meetings:write',
      'documents:read',
      'documents:write',
      'knowledge:read',
      'attendance:read',
      'attendance:write',
      'leaves:read',
      'leaves:write',
      'reports:read',
    ] as Permission[],
  },
} as const;

export const SYSTEM_ROLE_NAMES = Object.values(SYSTEM_ROLES).map((r) => r.name);
