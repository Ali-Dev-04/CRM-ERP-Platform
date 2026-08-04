export interface UserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserView;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  totalCents: string;
  currency: string;
  dueDate: string;
  client?: { id: string; name: string };
}

export interface Project {
  id: string;
  name: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  position: number;
}

export interface OrganizationMembership {
  organization: { id: string; name: string; slug: string };
  role: string;
}

export interface AnalyticsOverview {
  counts: { clients: number; activeProjects: number; employees: number };
  tasks: { byStatus: Record<string, number>; total: number; completionRate: number };
  finance: { revenuePaidCents: string; outstandingCents: string; overdueCents: string };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
