'use client';

import { useState } from 'react';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/data';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { TableSkeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Asset, Employee, Paginated } from '@/lib/types';

export default function AssetsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const aApi = useApi<Paginated<Asset>>(base ? `${base}/assets?size=100` : null);
  const eApi = useApi<Paginated<Employee>>(base ? `${base}/employees?size=100` : null);
  const employees = eApi.data?.items ?? [];

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function openForm() { setName(''); setSerial(''); setCategory(''); setValue(''); setErrMsg(null); setShowForm(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch(`${base}/assets`, { method: 'POST', body: JSON.stringify({ name: name.trim(), serialNumber: serial.trim() || undefined, category: category.trim() || undefined, valueCents: value ? Math.round(Number(value) * 100) : undefined }) });
      setShowForm(false); aApi.reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  async function assign(a: Asset, employeeId: string) {
    if (!base) return;
    try { await apiFetch(`${base}/assets/${a.id}/assign`, { method: 'PATCH', body: JSON.stringify({ employeeId: employeeId || null }) }); aApi.reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }
  async function retire(a: Asset) {
    if (!base) return;
    try { await apiFetch(`${base}/assets/${a.id}`, { method: 'DELETE' }); aApi.reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assets" subtitle="Track equipment and assignments." actions={<Button onClick={openForm} className="gap-2"><Plus className="h-4 w-4" /> New asset</Button>} />

      <Card className="card-elevated"><CardContent className="p-0">
        {aApi.loading ? <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
        : aApi.data && aApi.data.items.length > 0 ? (
          <Table head={<tr><Th>Asset</Th><Th>Category</Th><Th>Value</Th><Th>Status</Th><Th>Assign to</Th><Th></Th></tr>}>
            {aApi.data.items.map((a) => (
              <tr key={a.id} className="border-t hover:bg-muted/40">
                <Td><div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.serialNumber ?? 'no serial'}</p></div></Td>
                <Td className="text-muted-foreground">{a.category ?? '—'}</Td>
                <Td>{a.valueCents ? formatCurrency(a.valueCents) : '—'}</Td>
                <Td><StatusPill status={a.status} /></Td>
                <Td>
                  <select value={a.assignedToEmployeeId ?? ''} onChange={(e) => assign(a, e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                    <option value="">— unassigned —</option>
                    {employees.map((em) => <option key={em.id} value={em.id}>{em.firstName} {em.lastName}</option>)}
                  </select>
                </Td>
                <Td><button onClick={() => retire(a)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Retire"><Trash2 className="h-4 w-4" /></button></Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState icon={<Boxes className="h-5 w-5" />} title="No assets yet" hint="Add equipment to track and assign it." />}
      </CardContent></Card>
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New asset">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="an">Name *</Label><Input id="an" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="as">Serial number</Label><Input id="as" value={serial} onChange={(e) => setSerial(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ac">Category</Label><Input id="ac" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="av">Value ($)</Label><Input id="av" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add asset'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
