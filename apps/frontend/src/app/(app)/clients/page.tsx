'use client';

import { useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/data';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { TableSkeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Client, Paginated } from '@/lib/types';

type Form = {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  status: string;
};

const EMPTY: Form = { name: '', email: '', phone: '', company: '', address: '', notes: '', status: 'ACTIVE' };

export default function ClientsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const path = base ? `${base}/clients?size=50` : null;
  const { data, loading, error, reload } = useApi<Paginated<Client>>(path);

  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrMsg(null);
    setShowForm(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      company: c.company ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
      status: c.status,
    });
    setErrMsg(null);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true);
    setErrMsg(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
    };
    try {
      if (editing) {
        await apiFetch(`${base}/clients/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`${base}/clients`, { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      reload();
    } catch (err) {
      setErrMsg((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!base || !deleting) return;
    setBusy(true);
    try {
      await apiFetch(`${base}/clients/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      reload();
    } catch (err) {
      setErrMsg((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Manage your customer relationships."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New client
          </Button>
        }
      />

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
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
                  <Th className="text-right">Actions</Th>
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
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No clients yet"
              hint="Add your first client to start tracking relationships."
            />
          )}
        </CardContent>
      </Card>

      {/* Create / edit modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit client' : 'New client'}
        description={editing ? 'Update this client’s details.' : 'Add a new client to this workspace.'}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create client'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete client"
        description="This soft-deletes the client. You can restore from the database if needed."
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-medium text-foreground">{deleting?.name}</span>?
        </p>
        {errMsg && <p className="mt-2 text-sm text-danger">{errMsg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
