import type { Request } from 'express';

/**
 * Principal attached to the request after JWT verification.
 * Keep this minimal and serializable — it travels through every guard/pipe.
 */
export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
