'use client';

import { FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/data';
import { StatusPill } from '@/components/ui/status-pill';
import { TableSkeleton, EmptyState } from '@/components/ui/skeleton';
import type { Invoice, Paginated } from '@/lib/types';

export default function InvoicesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/invoices?size=50');
  const { data, loading, error } = useApi<Paginated<Invoice>>(path);

  const totalValue = data ? data.items.reduce((s, i) => s + Number(i.totalCents), 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={data && data.items.length > 0 ? `${data.items.length} invoices · ${formatCurrency(totalValue)} total` : 'Track billing and payments.'}
      />

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
          ) : error ? (
            <p className="p-6 text-sm text-danger">{error.message}</p>
          ) : data && data.items.length > 0 ? (
            <Table
              head={
                <tr>
                  <Th>Invoice</Th>
                  <Th>Status</Th>
                  <Th>Amount</Th>
                  <Th>Due</Th>
                </tr>
              }
            >
              {data.items.map((inv) => (
                <tr key={inv.id} className="border-t transition-colors hover:bg-muted/40">
                  <Td>
                    <span className="font-mono text-xs font-medium">{inv.number}</span>
                  </Td>
                  <Td><StatusPill status={inv.status} /></Td>
                  <Td className="font-semibold">{formatCurrency(inv.totalCents, inv.currency)}</Td>
                  <Td className="text-muted-foreground">{formatDate(inv.dueDate)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="No invoices yet" hint="Invoices you create will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
