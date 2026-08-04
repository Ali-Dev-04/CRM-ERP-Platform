'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Table, Td, Th } from '@/components/ui/data';
import type { Client, Paginated } from '@/lib/types';

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'border-green-200 bg-green-50 text-green-700',
  INACTIVE: 'border-muted bg-muted text-muted-foreground',
  BLACKLISTED: 'border-red-200 bg-red-50 text-red-700',
};

export default function ClientsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/clients?size=50');
  const { data, loading, error } = useApi<Paginated<Client>>(path);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clients</h1>
      <Card>
        <CardHeader>
          <CardTitle>All clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {data && (
            <Table
              head={
                <tr>
                  <Th>Name</Th>
                  <Th>Company</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              }
            >
              {data.items.map((c) => (
                <tr key={c.id} className="border-t">
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.company ?? '—'}</Td>
                  <Td>{c.email ?? '—'}</Td>
                  <Td>
                    <Badge className={STATUS_TONE[c.status] ?? ''}>{c.status}</Badge>
                  </Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td className="text-muted-foreground">No clients yet.</Td>
                </tr>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
