'use client';

import { Settings as SettingsIcon, Building2, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, orgs, activeOrgId } = useAuth();
  const activeOrg = orgs.find((m) => m.organization.id === activeOrgId)?.organization;
  const role = orgs.find((m) => m.organization.id === activeOrgId)?.role;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Workspace and account details." />

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card className="card-elevated">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><UserCircle className="h-4 w-4" /></div>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-1">
              {user ? <Avatar name={`${user.firstName} ${user.lastName}`} size={40} /> : null}
              <div>
                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2"><Row label="Status" value={user?.status ?? '—'} /></div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <SettingsIcon className="h-4 w-4" />
          More settings (members, billing, integrations) are on the roadmap.
        </CardContent>
      </Card>
    </div>
  );
}
