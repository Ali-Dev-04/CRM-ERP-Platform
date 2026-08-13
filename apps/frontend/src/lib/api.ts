import type { ApiError, AuthResponse, UserView } from './types';

// In dev, call the backend directly to avoid the Next.js proxy timeout on
// long-running requests (AI calls take 10-20s). CORS is configured on the API.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const ACCESS_KEY = 'crm.accessToken';
const REFRESH_KEY = 'crm.refreshToken';

export const tokens = {
  getAccess(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function parseError(res: Response): Promise<ApiError> {
  try {
    return (await res.json()) as ApiError;
  } catch {
    return { code: 'network', message: res.statusText };
  }
}

/** Core fetch wrapper: injects the bearer token and auto-refreshes once on 401. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const access = tokens.getAccess();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && access) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${tokens.getAccess()!}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh = tokens.getRefresh();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      tokens.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      tokens.clear();
      return false;
    }
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

export const api = {
  register: (body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => {
    const refresh = tokens.getRefresh();
    if (refresh) apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) });
    tokens.clear();
  },
  me: () => apiFetch<UserView>('/auth/me'),
};
