'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Calendar,
  Bell,
  BookOpen,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, orgs, activeOrgId, loading, logout, setActiveOrg } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="border-b p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">CRM + ERP</p>
          <select
            className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={activeOrgId ?? ''}
            onChange={(e) => setActiveOrg(e.target.value)}
          >
            {orgs.map((m) => (
              <option key={m.organization.id} value={m.organization.id}>
                {m.organization.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1 text-sm">{user.firstName} {user.lastName}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); router.replace('/login'); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="border-b px-6 py-4 md:hidden">
          <select
            className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={activeOrgId ?? ''}
            onChange={(e) => setActiveOrg(e.target.value)}
          >
            {orgs.map((m) => (
              <option key={m.organization.id} value={m.organization.id}>{m.organization.name}</option>
            ))}
          </select>
        </div>
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
