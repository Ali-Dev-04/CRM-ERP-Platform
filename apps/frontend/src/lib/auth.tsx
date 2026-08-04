'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokens } from './api';
import type { OrganizationMembership, UserView } from './types';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: UserView | null;
  orgs: OrganizationMembership[];
  activeOrgId: string | null;
  activeWorkspaceId: string | null;
  loading: boolean;
  setActiveOrg: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const ACTIVE_ORG_KEY = 'crm.activeOrgId';

async function getJson(path: string): Promise<unknown | null> {
  const access = tokens.getAccess();
  if (!access) return null;
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${access}` } });
  return res.ok ? ((await res.json()) as unknown) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [orgs, setOrgs] = useState<OrganizationMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspacesFor = useCallback(async (orgId: string) => {
    const ws = (await getJson(`/organizations/${orgId}/workspaces`)) as Workspace[] | null;
    setActiveWorkspaceId(ws && ws.length > 0 ? ws[0]!.id : null);
  }, []);

  const bootstrap = useCallback(async () => {
    if (!tokens.getAccess()) {
      setLoading(false);
      return;
    }
    try {
      setUser(await api.me());
      const memberships = (await getJson('/organizations')) as OrganizationMembership[] | null;
      const list = memberships ?? [];
      setOrgs(list);
      const stored = localStorage.getItem(ACTIVE_ORG_KEY);
      const first = list[0]?.organization.id ?? null;
      const org = stored && list.some((m) => m.organization.id === stored) ? stored : first;
      setActiveOrgId(org);
      if (org) await loadWorkspacesFor(org);
    } catch {
      tokens.clear();
    } finally {
      setLoading(false);
    }
  }, [loadWorkspacesFor]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const setActiveOrg = useCallback(
    (id: string) => {
      setActiveOrgId(id);
      localStorage.setItem(ACTIVE_ORG_KEY, id);
      void loadWorkspacesFor(id);
    },
    [loadWorkspacesFor],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      tokens.set(res.accessToken, res.refreshToken);
      setUser(res.user);
      await bootstrap();
    },
    [bootstrap],
  );

  const register = useCallback(
    async (body: Parameters<typeof api.register>[0]) => {
      const res = await api.register(body);
      tokens.set(res.accessToken, res.refreshToken);
      setUser(res.user);
      await bootstrap();
    },
    [bootstrap],
  );

  const logout = useCallback(() => {
    api.logout();
    tokens.clear();
    setUser(null);
    setOrgs([]);
    setActiveOrgId(null);
    setActiveWorkspaceId(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      orgs,
      activeOrgId,
      activeWorkspaceId,
      loading,
      setActiveOrg,
      login,
      register,
      logout,
    }),
    [user, orgs, activeOrgId, activeWorkspaceId, loading, setActiveOrg, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
