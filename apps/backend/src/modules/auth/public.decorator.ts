import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route/controller as not requiring authentication. Use sparingly —
 * only for auth endpoints and health checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
