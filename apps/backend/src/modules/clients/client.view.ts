import type { Client } from '@prisma/client';

export interface ClientView {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  status: Client['status'];
  createdAt: Date;
  updatedAt: Date;
}

export function toClientView(c: Client): ClientView {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    address: c.address,
    notes: c.notes,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
