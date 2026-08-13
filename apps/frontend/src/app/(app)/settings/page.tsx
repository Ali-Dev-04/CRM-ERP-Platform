'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, UserCircle, Pencil, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { ApiError } from '@/lib/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, orgs, activeOrgId, refreshUser, isManager } = useAuth();
  const activeOrg = orgs.find((m) => m.organization.id === activeOrgId)?.organization;
  const role = orgs.find((m) => m.organization.id === activeOrgId)?.role;

  const [showProfile, setShowProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  function openProfile() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEmail(user?.email ?? '');
    setErrMsg(null); setShowProfile(true);
  }
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() }) });
      await refreshUser();
      setShowProfile(false);
      setOkMsg('Profile updated.');
      setTimeout(() => setOkMsg(null), 3000);
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  function openPw() { setCur(''); setNext(''); setConfirm(''); setErrMsg(null); setShowPw(true); }
  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setErrMsg('New passwords do not match.'); return; }
    if (next.length < 12) { setErrMsg('New password must be at least 12 characters.'); return; }
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) { setErrMsg('New password needs a letter and a number.'); return; }
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch('/auth/me/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: cur, newPassword: next }) });
      setShowPw(false);
      setOkMsg('Password changed. Other devices were signed out.');
      setTimeout(() => setOkMsg(null), 4000);
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile, password, and workspace." />

      {okMsg && <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">{okMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Organization */}
        <Card className="card-elevated">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Building2 className="h-4 w-4" /></div>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <Row label="Name" value={activeOrg?.name ?? '—'} />
            <Row label="Slug" value={activeOrg?.slug ?? '—'} />
            <Row label="Your role" value={role ?? '—'} />
          </CardContent>
        </Card>

        {/* Account (editable) */}
        <Card className="card-elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><UserCircle className="h-4 w-4" /></div>
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={openProfile} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit profile</Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-1">
              {user ? <Avatar name={`${user.firstName} ${user.lastName}`} size={44} /> : null}
              <div>
                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2"><Row label="Status" value={user?.status ?? '—'} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <Card className="card-elevated">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><ShieldCheck className="h-4 w-4" /></div>
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={openPw} className="gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Change password</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Update your password. Changing it signs out other active sessions.</p>
        </CardContent>
      </Card>

      {/* Members management (managers only) */}
      {isManager && (
        <Card className="card-elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Users className="h-4 w-4" /></div>
              <CardTitle className="text-base">Team</CardTitle>
            </div>
            <Link href="/members" className="text-sm font-medium text-primary hover:underline">Manage members →</Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Invite people, assign Admin/Member roles, and remove access.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit profile modal */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="Edit profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="fn">First name</Label><Input id="fn" required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ln">Last name</Label><Input id="ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="em">Email</Label><Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowProfile(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
        </form>
      </Modal>

      {/* Change password modal */}
      <Modal open={showPw} onClose={() => setShowPw(false)} title="Change password">
        <form onSubmit={savePw} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="cur">Current password</Label><Input id="cur" type="password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="next">New password</Label><Input id="next" type="password" required value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="cfm">Confirm new password</Label><Input id="cfm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Min 12 characters, with a letter and a number.</p>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowPw(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
