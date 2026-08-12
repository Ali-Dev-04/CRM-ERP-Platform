'use client';

import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, LogIn, LogOut } from 'lucide-react';
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
import type { ApiError, Employee, Paginated } from '@/lib/types';

interface Form {
  firstName: string; lastName: string; email: string; jobTitle: string;
  department: string; phone: string; status: string; hireDate: string; salary: string;
}
const EMPTY: Form = { firstName: '', lastName: '', email: '', jobTitle: '', department: '', phone: '', status: 'ACTIVE', hireDate: '', salary: '' };

export default function EmployeesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const path = base ? `${base}/employees?size=100` : null;
  const { data, loading, error, reload } = useApi<Paginated<Employee>>(path);

  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openCreate() { setEditing(null); setForm(EMPTY); setErrMsg(null); setShowForm(true); }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      firstName: e.firstName, lastName: e.lastName, email: e.email, jobTitle: e.jobTitle ?? '',
      department: e.department ?? '', phone: e.phone ?? '', status: e.status,
      hireDate: e.hireDate ? e.hireDate.slice(0, 10) : '', salary: e.salaryCents ? String(Number(e.salaryCents) / 100) : '',
    });
    setErrMsg(null); setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true); setErrMsg(null);
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
      jobTitle: form.jobTitle.trim() || undefined, department: form.department.trim() || undefined,
      phone: form.phone.trim() || undefined, status: form.status,
      hireDate: form.hireDate || undefined,
      salaryCents: form.salary ? Math.round(Number(form.salary) * 100) : undefined,
    };
    try {
      if (editing) await apiFetch(`${base}/employees/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiFetch(`${base}/employees`, { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false); reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!base || !deleting) return;
    setBusy(true);
    try { await apiFetch(`${base}/employees/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  async function clock(e: Employee, action: 'in' | 'out') {
    if (!base) return;
    try {
      await apiFetch(`${base}/employees/${e.id}/attendance/clock-${action}`, { method: 'POST', body: '{}' });
      setErrMsg(null);
    } catch (err) { setErrMsg((err as ApiError).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" subtitle="Manage staff, attendance, and roles." actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New employee</Button>} />

      <Card className="card-elevated"><CardContent className="p-0">
        {loading ? <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
        : error ? <p className="p-6 text-sm text-danger">{error.message}</p>
        : data && data.items.length > 0 ? (
          <Table head={<tr><Th>Employee</Th><Th>Department</Th><Th>Role</Th><Th>Status</Th><Th>Hired</Th><Th className="text-right">Attendance / Actions</Th></tr>}>
            {data.items.map((e) => (
              <tr key={e.id} className="border-t transition-colors hover:bg-muted/40">
                <Td><div className="flex items-center gap-3"><Avatar name={`${e.firstName} ${e.lastName}`} size={32} /><div><p className="font-medium">{e.firstName} {e.lastName}</p><p className="text-xs text-muted-foreground">{e.email}</p></div></div></Td>
                <Td className="text-muted-foreground">{e.department ?? '—'}</Td>
                <Td className="text-muted-foreground">{e.jobTitle ?? '—'}</Td>
                <Td><StatusPill status={e.status} /></Td>
                <Td className="text-muted-foreground">{formatDate(e.hireDate)}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => clock(e, 'in')} title="Clock in" className="rounded-md p-1.5 text-muted-foreground hover:bg-success-soft hover:text-success"><LogIn className="h-4 w-4" /></button>
                    <button onClick={() => clock(e, 'out')} title="Clock out" className="rounded-md p-1.5 text-muted-foreground hover:bg-info-soft hover:text-info"><LogOut className="h-4 w-4" /></button>
                    <span className="mx-1 h-4 w-px bg-border" />
                    <button onClick={() => openEdit(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleting(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState icon={<Users className="h-5 w-5" />} title="No employees yet" hint="Add team members to manage attendance and leave." />}
      </CardContent></Card>
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit employee' : 'New employee'} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="fn">First name *</Label><Input id="fn" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ln">Last name *</Label><Input id="ln" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="em">Email *</Label><Input id="em" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ph">Phone</Label><Input id="ph" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="jt">Role / job title</Label><Input id="jt" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="dp">Department</Label><Input id="dp" value={form.department} onChange={(e) => set('department', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label htmlFor="st">Status</Label>
              <select id="st" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="hd">Hire date</Label><Input id="hd" type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="sl">Salary ($/yr)</Label><Input id="sl" type="number" min="0" step="0.01" value={form.salary} onChange={(e) => set('salary', e.target.value)} /></div>
          </div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}</Button></div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove employee" size="sm">
        <p className="text-sm text-muted-foreground">Remove <span className="font-medium text-foreground">{deleting?.firstName} {deleting?.lastName}</span>? This marks them terminated.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</Button></div>
      </Modal>
    </div>
  );
}
