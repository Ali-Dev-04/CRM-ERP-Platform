'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, InviteResult, Member } from '@/lib/types';

const ROLES = ['Owner', 'Admin', 'Member'];

export default function MembersPage() {
  const { activeOrgId } = useAuth();
  const membersPath = activeOrgId ? `/organizations/${activeOrgId}/members` : null;
  const { data, loading, reload } = useApi<Member[]>(membersPath);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Member');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<{ email: string; pw: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  function openInvite() {
    setEmail(''); setFirstName(''); setLastName(''); setRole('Member'); setErrMsg(null); setShowInvite(true);
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    setBusy(true); setErrMsg(null);
    try {
      const res = await apiFetch<InviteResult>(`/organizations/${activeOrgId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined, role }),
      });
      setShowInvite(false);
      if (res.tempPassword) setTempPw({ email: res.member.email, pw: res.tempPassword });
      reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  async function changeRole(m: Member, newRole: string) {
    if (!activeOrgId || newRole === m.role) return;
    try { await apiFetch(`/organizations/${activeOrgId}/members/${m.id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) }); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }

  async function confirmRemove() {
    if (!activeOrgId || !removing) return;
    setBusy(true);
    try { await apiFetch(`/organizations/${activeOrgId}/members/${removing.id}`, { method: 'DELETE' }); setRemoving(null); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  function copyPw() {
    if (tempPw) { navigator.clipboard.writeText(tempPw.pw); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle="Invite people and manage their roles." actions={<Button onClick={openInvite} className="gap-2"><UserPlus className="h-4 w-4" /> Invite member</Button>} />

      {/* Temp password banner */}
      {tempPw && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success-soft px-4 py-3">
          <div className="flex items-center gap-3">
            <Check className="h-4 w-4 text-success" />
            <div>
              <p className="text-sm font-medium text-success">{tempPw.email} invited.</p>
              <p className="text-xs text-success/80">Temp password: <code className="rounded bg-success/10 px-1.5 py-0.5 font-mono">{tempPw.pw}</code> — share it once (shown only here).</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyPw} className="gap-1.5">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}</Button>
            <Button variant="ghost" size="sm" onClick={() => setTempPw(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <Card className="card-elevated"><CardContent className="p-0">
        {loading ? <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : data && data.length > 0 ? (
          <ul className="divide-y divide-border">
            {data.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={`${m.firstName} ${m.lastName}`} size={36} />
                  <div>
                    <p className="text-sm font-semibold">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={() => setRemoving(m)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<UserPlus className="h-5 w-5" />} title="No members yet" hint="Invite people to join your organization." />}
      </CardContent></Card>
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite member" description="They'll get a login linked to this organization.">
        <form onSubmit={submitInvite} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="em">Email *</Label><Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="fn">First name</Label><Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ln">Last name</Label><Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="rl">Role</Label>
            <select id="rl" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Member">Member — limited access</option>
              <option value="Admin">Admin — full access except org settings</option>
            </select>
          </div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Inviting…' : 'Invite'}</Button></div>
        </form>
      </Modal>

      {/* Remove confirm */}
      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remove member" size="sm">
        <p className="text-sm text-muted-foreground">Remove <span className="font-medium text-foreground">{removing?.firstName} {removing?.lastName}</span> from this organization? Their account is kept but they lose access.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="destructive" onClick={confirmRemove} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</Button></div>
      </Modal>
    </div>
  );
}
