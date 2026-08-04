import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import { RbacService } from './rbac.service';
import { ForbiddenError, UnauthorizedError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import type { AuthUser } from '../../common/context/authenticated-request';

/**
 * Enforces @RequirePermissions against the resolved permission set for the
 * authenticated user in the active organization.
 *
 * Active organization resolution order:
 *   1. `:organizationId` route param
 *   2. `:orgId` route param
 *   3. `x-organization-id` header
 *
 * Compose with JwtAuthGuard (APP_GUARD) so request.user is populated first.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) throw new UnauthorizedError(ErrorCodes.TOKEN_INVALID, 'Not authenticated');

    const organizationId = this.resolveOrganization(request);
    if (!organizationId) {
      throw new ForbiddenError(
        ErrorCodes.MEMBERSHIP_REQUIRED,
        'Active organization is required for this action',
      );
    }

    const perms = await this.rbac.getPermissions(user.userId, organizationId);
    const ok = required.every((p) => perms.has(p));
    if (!ok) {
      throw new ForbiddenError(
        ErrorCodes.FORBIDDEN,
        'You do not have permission to perform this action',
        { required, organizationId },
      );
    }
    return true;
  }

  private resolveOrganization(req: Request): string | undefined {
    const params = (req.params ?? {}) as Record<string, string>;
    const header = req.headers['x-organization-id'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    return params.organizationId ?? params.orgId ?? headerValue;
  }
}
