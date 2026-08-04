import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Attach to a controller/route to require one or more permissions.
 * All listed permissions are required (AND semantics). Enforced by
 * PermissionsGuard. The active organization is resolved from the request
 * (header `x-organization-id` or `:organizationId` / `:orgId` route param).
 *
 * @example
 *   @RequirePermissions('clients:write')
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
