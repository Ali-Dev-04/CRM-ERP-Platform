/**
 * Centralized, stable error codes. Clients branch on these; never rename an
 * existing code (only deprecate). Group by domain prefix.
 */
export const ErrorCodes = {
  // Identity / auth
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  TOKEN_EXPIRED: 'auth.token_expired',
  TOKEN_INVALID: 'auth.token_invalid',
  REFRESH_TOKEN_REUSE: 'auth.refresh_token_reuse',
  EMAIL_ALREADY_USED: 'auth.email_already_used',
  USER_NOT_FOUND: 'user.not_found',
  USER_DISABLED: 'user.disabled',

  // Authorization
  FORBIDDEN: 'authz.forbidden',

  // Organizations / workspaces
  ORG_SLUG_TAKEN: 'organization.slug_taken',
  ORG_NOT_FOUND: 'organization.not_found',
  WORKSPACE_NOT_FOUND: 'workspace.not_found',
  MEMBERSHIP_REQUIRED: 'organization.membership_required',

  // Generic
  NOT_FOUND: 'common.not_found',
  VALIDATION: 'common.validation',
  CONFLICT: 'common.conflict',
  INTERNAL: 'common.internal',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
