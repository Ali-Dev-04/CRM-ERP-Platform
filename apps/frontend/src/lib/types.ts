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
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
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
  description: string | null;
  status: string;
}

export interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  position: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  status: string;
  phone: string | null;
  hireDate: string | null;
  salaryCents: string | null;
}

export interface Leave {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
}

export interface Asset {
  id: string;
  name: string;
  serialNumber: string | null;
  category: string | null;
  status: string;
  valueCents: string | null;
  assignedToEmployeeId: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface DocFile {
  id: string;
  name: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
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

export interface AiResult {
  content: string;
  model: string;
  mocked: boolean;
}
