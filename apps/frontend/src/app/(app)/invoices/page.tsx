'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Table, Td, Th } from '@/components/ui/data';
import type { Invoice, Paginated } from '@/lib/types';

const STATUS_TONE: Record<string, string> = {
  PAID: 'border-green-200 bg-green-50 text-green-700',
  SENT: 'border-blue-200 bg-blue-50 text-blue-700',
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  DRAFT: 'border-muted bg-muted text-muted-foreground',
  CANCELLED: 'border-muted bg-muted text-muted-foreground',
  PARTIALLY_PAID: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function InvoicesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/invoices?size=50');
  const { data, loading, error } = useApi<Paginated<Invoice>>(path);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <Card>
        <CardHeader>
          <CardTitle>All invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {data && (
            <Table
              head={
                <tr>
                  <Th>Number</Th>
                  <Th>Status</Th>
                  <Th>Total</Th>
                  <Th>Due</Th>
                </tr>
              }
            >
              {data.items.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <Td className="font-mono">{inv.number}</Td>
                  <Td>
                    <Badge className={STATUS_TONE[inv.status] ?? ''}>
                      {inv.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </Td>
                  <Td>{formatCurrency(inv.totalCents, inv.currency)}</Td>
                  <Td>{formatDate(inv.dueDate)}</Td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td className="text-muted-foreground">No invoices yet.</Td>
                </tr>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
