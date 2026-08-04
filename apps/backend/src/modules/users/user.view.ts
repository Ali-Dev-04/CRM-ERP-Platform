import type { User } from '@prisma/client';

/** Public projection of a user — never expose passwordHash. */
export interface UserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: User['status'];
  createdAt: Date;
}

export function toUserView(user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'status' | 'createdAt'>): UserView {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    createdAt: user.createdAt,
  };
}
