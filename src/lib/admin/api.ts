/**
 * فاز ۱۲ — کلاینت تایپشده‌ی مسیرهای پنل مدیریت.
 *
 * ⚠️ تمام درخواست‌ها از طریق `authedRequest` میگذرند تا Bearer Token تزریق شود.
 *    هیچ مقادیر پیش‌فرض مالیای در کلاینت ساخته نمی‌شود؛ تمام اعداد از سروراند.
 */

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

export interface DashboardCard {
  id: string;
  label: string;
  value: number;
  href: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail {
  user: AdminUser;
  projects: Array<{
    id: string; code: string; name: string; status: string;
    estimateAmount: number; createdAt: string;
  }>;
  wallet: { available: number; reserved: number; updatedAt: string } | null;
  transactions: Array<{
    id: string; kind: string; amount: number; projectId: string | null; createdAt: string;
  }>;
}

export interface ServiceType {
  id: string;
  slug: string;
  name: string;
  pricePerPage: number;
  unit: string;
  description: string | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignPreset {
  id: string;
  name: string;
  description: string | null;
  spec: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  serviceTypeId: string | null;
  imageKind: 'parspack' | 'static' | 'none';
  imageSrc: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AuditEvent {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipHash: string | null;
  createdAt: string;
}

export interface SiteSettings {
  [key: string]: string;
}

export interface PageMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface AdminConversation {
  id: string;
  projectId: string | null;
  peerName: string;
  preview: string | null;
  lastMessageAt: string;
}

export interface AdminApi {
  dashboard(): Promise<{ cards: DashboardCard[] }>;
  users(query?: string, offset?: number): Promise<{ users: AdminUser[]; page: PageMeta }>;
  userDetail(id: string): Promise<AdminUserDetail>;
  serviceTypes(): Promise<{ services: ServiceType[] }>;
  saveServiceType(id: string, patch: Partial<Pick<ServiceType, 'name' | 'pricePerPage' | 'description' | 'isPopular' | 'isActive' | 'sortOrder'>>): Promise<{ service: ServiceType }>;
  createServiceType(input: { slug: string; name: string; pricePerPage: number; description?: string }): Promise<{ service: ServiceType }>;
  reorderServiceTypes(ids: string[]): Promise<unknown>;
  designPresets(): Promise<{ presets: DesignPreset[] }>;
  createDesignPreset(input: { name: string; description?: string; cloneFrom?: string; spec?: Record<string, unknown> }): Promise<{ preset: DesignPreset }>;
  saveDesignPreset(id: string, patch: { name?: string; description?: string; spec?: Record<string, unknown>; isActive?: boolean }): Promise<{ preset: DesignPreset }>;
  portfolio(): Promise<{ items: PortfolioItem[] }>;
  createPortfolioItem(input: { title: string; category: string; description?: string; imageUrl?: string; sortOrder?: number }): Promise<{ item: PortfolioItem }>;
  savePortfolioItem(id: string, patch: Partial<Pick<PortfolioItem, 'title' | 'category' | 'description' | 'sortOrder' | 'isPublished'>> & { imageUrl?: string }): Promise<{ item: PortfolioItem }>;
  reorderPortfolio(ids: string[]): Promise<unknown>;
  settings(): Promise<{ settings: SiteSettings; allowedKeys: string[] }>;
  saveSettings(settings: SiteSettings): Promise<{ updated: number; settings: SiteSettings }>;
  audit(filters?: { action?: string; actor?: string; from?: string; to?: string; offset?: number }): Promise<{ events: AuditEvent[]; page: PageMeta }>;
  messages(): Promise<{ conversations: AdminConversation[] }>;
}

export function createAdminApi(request: AuthedRequest): AdminApi {
  const q = (params: Record<string, string | number | undefined>): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const encoded = search.toString();
    return encoded ? `?${encoded}` : '';
  };

  return {
    dashboard: () => request('/admin/dashboard'),
    users: (query, offset) => request(`/admin/users${q({ q: query, offset })}`),
    userDetail: (id) => request(`/admin/users/${encodeURIComponent(id)}`),
    serviceTypes: () => request('/admin/service-types'),
    saveServiceType: (id, patch) => request(`/admin/service-types/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    createServiceType: (input) => request('/admin/service-types', { method: 'POST', body: input }),
    reorderServiceTypes: (ids) => request('/admin/service-types/reorder', { method: 'POST', body: { ids } }),
    designPresets: () => request('/admin/design-presets'),
    createDesignPreset: (input) => request('/admin/design-presets', { method: 'POST', body: input }),
    saveDesignPreset: (id, patch) => request(`/admin/design-presets/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    portfolio: () => request('/admin/portfolio'),
    createPortfolioItem: (input) => request('/admin/portfolio', { method: 'POST', body: input }),
    savePortfolioItem: (id, patch) => request(`/admin/portfolio/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    reorderPortfolio: (ids) => request('/admin/portfolio/reorder', { method: 'POST', body: { ids } }),
    settings: () => request('/admin/settings'),
    saveSettings: (settings) => request('/admin/settings', { method: 'PATCH', body: { settings } }),
    audit: (filters) => request(`/admin/audit${q(filters ?? {})}`),
    messages: () => request('/admin/messages'),
  };
}
