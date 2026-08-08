'use client';

import { Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/data';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { TableSkeleton, EmptyState } from '@/components/ui/skeleton';
import type { Client, Paginated } from '@/lib/types';

export default function ClientsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/clients?size=50');
  const { data, loading, error } = useApi<Paginated<Client>>(path);

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle="Manage your customer relationships." />

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} cols={4} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-danger">{error.message}</p>
          ) : data && data.items.length > 0 ? (
            <Table
              head={
                <tr>
                  <Th>Client</Th>
                  <Th>Company</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Added</Th>
                </tr>
              }
            >
              {data.items.map((c) => (
                <tr key={c.id} className="border-t transition-colors hover:bg-muted/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{c.company ?? '—'}</Td>
                  <Td className="text-muted-foreground">{c.email ?? '—'}</Td>
                  <Td><StatusPill status={c.status} /></Td>
                  <Td className="text-muted-foreground">{formatDate(c.createdAt)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No clients yet" hint="Clients you add will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
