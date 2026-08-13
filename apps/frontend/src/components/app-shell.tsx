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
  Layers,
  ChevronDown,
  UserCog,
  CalendarDays,
  Boxes,
  Paperclip,
  Megaphone,
  Sparkles,
  Settings,
  UserPlus,
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type NavItem = { href: string; label: string; icon: React.ElementType; roles?: Role[] };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['Owner', 'Admin'] },
  { href: '/employees', label: 'Employees', icon: UserCog, roles: ['Owner', 'Admin'] },
  { href: '/leaves', label: 'Leaves', icon: CalendarDays },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['Owner', 'Admin'] },
  { href: '/assets', label: 'Assets', icon: Boxes, roles: ['Owner', 'Admin'] },
  { href: '/files', label: 'Files', icon: Paperclip },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/members', label: 'Members', icon: UserPlus, roles: ['Owner', 'Admin'] },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-soft">
        <Layers className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight">CRM + ERP</p>
        <p className="text-[11px] text-muted-foreground">Workspace</p>
      </div>
    </div>
  );
}

function OrgSwitcher({ className }: { className?: string }) {
  const { orgs, activeOrgId, setActiveOrg } = useAuth();
  const active = orgs.find((m) => m.organization.id === activeOrgId)?.organization;
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">Active organization</span>
      <select
        className="w-full appearance-none rounded-lg border border-border bg-card py-2 pl-3 pr-8 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-ring"
        value={activeOrgId ?? ''}
        onChange={(e) => setActiveOrg(e.target.value)}
      >
        {orgs.map((m) => (
          <option key={m.organization.id} value={m.organization.id}>
            {m.organization.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {active ? (
        <span className="sr-only">Active organization: {active.name}</span>
      ) : null}
    </label>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:border-r lg:border-border lg:bg-card">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="px-3 pb-3">
          <OrgSwitcher />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin">
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          {NAV.filter((item) => !item.roles || !activeRole || item.roles.includes(activeRole)).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={`${user.firstName} ${user.lastName}`} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
                {activeRole && <span className="ml-2 inline-block rounded-full bg-primary-soft px-1.5 py-0.5 align-middle text-[10px] font-semibold text-primary">{activeRole}</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Signed in as <span className="font-medium text-foreground">{user.firstName}</span>
            </span>
            <Avatar name={`${user.firstName} ${user.lastName}`} size={32} />
          </div>
        </header>
        <div className="lg:hidden border-b border-border bg-card px-4 py-2">
          <OrgSwitcher />
        </div>
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-6xl animate-fade-up px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
