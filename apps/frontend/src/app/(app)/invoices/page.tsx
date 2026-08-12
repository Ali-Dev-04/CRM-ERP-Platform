'use client';

import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/data';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { TableSkeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Client, Invoice, Paginated } from '@/lib/types';

interface Line { description: string; quantity: string; unitPrice: string }
const STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoicesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const listPath = base ? `${base}/invoices?size=50` : null;
  const clientsPath = base ? `${base}/clients?size=100` : null;
  const { data, loading, error, reload } = useApi<Paginated<Invoice>>(listPath);
  const { data: clientsData } = useApi<Paginated<Client>>(clientsPath);
  const clients = clientsData?.items ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: '1', unitPrice: '0' }]);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * Math.round((Number(l.unitPrice) || 0) * 100), 0);
    return { subtotal, total: subtotal };
  }, [lines]);

  const totalValue = data ? data.items.reduce((s, i) => s + Number(i.totalCents), 0) : 0;

  function openCreate() {
    setClientId(clients[0]?.id ?? '');
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setLines([{ description: '', quantity: '1', unitPrice: '0' }]);
    setErrMsg(null);
    setShowCreate(true);
  }
  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { description: '', quantity: '1', unitPrice: '0' }]);
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    if (!clientId) { setErrMsg('Pick a client.'); return; }
    if (lines.length === 0 || lines.some((l) => !l.description.trim())) { setErrMsg('Each line needs a description.'); return; }
    setBusy(true);
    setErrMsg(null);
    try {
      await apiFetch(`${base}/invoices`, {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          dueDate,
          lines: lines.map((l) => ({
            description: l.description.trim(),
            quantity: Number(l.quantity) || 0,
            unitPriceCents: Math.round((Number(l.unitPrice) || 0) * 100),
          })),
        }),
      });
      setShowCreate(false);
      reload();
    } catch (err) {
      setErrMsg((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(inv: Invoice, status: string) {
    if (!base || status === inv.status) return;
    setStatusErr(null);
    try {
      await apiFetch(`${base}/invoices/${inv.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      reload();
    } catch (err) {
      setStatusErr((err as ApiError).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={data && data.items.length > 0 ? `${data.items.length} invoices · ${formatCurrency(totalValue)} total` : 'Track billing and payments.'}
        actions={<Button onClick={openCreate} className="gap-2" disabled={clients.length === 0}><Plus className="h-4 w-4" /> New invoice</Button>}
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
                  <Th className="text-right">Update status</Th>
                </tr>
              }
            >
              {data.items.map((inv) => (
                <tr key={inv.id} className="border-t transition-colors hover:bg-muted/40">
                  <Td><span className="font-mono text-xs font-medium">{inv.number}</span></Td>
                  <Td><StatusPill status={inv.status} /></Td>
                  <Td className="font-semibold">{formatCurrency(inv.totalCents, inv.currency)}</Td>
                  <Td className="text-muted-foreground">{formatDate(inv.dueDate)}</Td>
                  <Td>
                    <div className="flex justify-end">
                      <select
                        value={inv.status}
                        onChange={(e) => changeStatus(inv, e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}
                      </select>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState
              icon={<FileText className="h-5 w-5" />}
              title="No invoices yet"
              hint={clients.length === 0 ? 'Add a client first, then create an invoice.' : 'Create your first invoice.'}
            />
          )}
        </CardContent>
      </Card>
      {statusErr && <p className="text-sm text-danger">{statusErr}</p>}

      {/* Create invoice modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New invoice" description="Items below compute the invoice total." size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client">Client</Label>
              <select id="client" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add line</Button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Description" required value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                <Input className="w-20" type="number" min="0" step="1" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <Input className="w-28" type="number" min="0" step="0.01" placeholder="Unit $" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                <button type="button" onClick={() => removeLine(i)} className="rounded-md p-2 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove line">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Total: <span className="ml-1 font-semibold text-foreground">{formatCurrency(totals.total)}</span></span>
          </div>

          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create invoice'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
