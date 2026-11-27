/**
 * فاز ۱۲ — کلاینت تایپشده‌ی مسیرهای پنل مدیریت.
 *
 * ⚠️ تمام درخواست‌ها از طریق `authedRequest` میگذرند تا Bearer Token تزریق شود.
 *    هیچ مقادیر پیش‌فرض مالیای در کلاینت ساخته نمی‌شود؛ تمام اعداد از سروراند.
 */

import type {
  AdminPricingCatalog,
  CreatePricingVersionInput,
  PricingLanguage,
  PricingMatrixRow,
  PricingType,
  PricingVersion,
} from '@/lib/pricing/types';

export type {
  AdminPricingCatalog,
  CreatePricingVersionInput,
  PricingLanguage,
  PricingMatrixRow,
  PricingType,
  PricingVersion,
} from '@/lib/pricing/types';

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

export type CustomerAccessStatus = 'normal' | 'credit' | 'disabled';

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  /** وضعیت امنیتی حساب؛ با حالت دسترسی مشتری متفاوت است. */
  status: string;
  customerAccess: CustomerAccessStatus;
  creditEnabled: boolean;
  avatarUrl: string | null;
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

export interface AdminFile {
  id: string;
  originalName: string;
  fileCode: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  createdAt: string;
  uploaderUsername?: string | null;
  uploaderAvatarUrl?: string | null;
  firstUserName?: string | null;
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

export interface DashboardCardsSection {
  section: 'cards';
  data: DashboardCard[];
  dataVersion: number;
  serverTime: string;
}

export interface AdminApi {
  dashboard(): Promise<{ cards: DashboardCard[] }>;
  dashboardCards(): Promise<DashboardCardsSection>;
  users(query?: string, offset?: number): Promise<{ users: AdminUser[]; page: PageMeta }>;
  userDetail(id: string): Promise<AdminUserDetail>;
  updateUserAccessStatus(
    id: string,
    input: { status: CustomerAccessStatus; reason: string },
  ): Promise<{ user: AdminUser; unchanged?: boolean }>;
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
  files(
    uploader?: string,
    offset?: number,
    scope?: 'all' | 'project' | 'delivery' | 'receipt',
  ): Promise<{
    files: AdminFile[];
    page: PageMeta;
    filters?: Array<{ id: string; label: string; count: number }>;
    scope?: string;
  }>;

  /* فاز ۱۲٫۳۴ — نرخ‌نامهٔ جدید (نوع × زبان × نسخه). */
  pricingCatalog(): Promise<AdminPricingCatalog>;
  createPricingType(input: { name: string }): Promise<{ type: PricingType }>;
  updatePricingType(
    id: string,
    patch: { name?: string; isActive?: boolean; sortOrder?: number },
  ): Promise<{ type: PricingType }>;
  createPricingLanguage(input: { name: string }): Promise<{ language: PricingLanguage }>;
  updatePricingLanguage(
    id: string,
    patch: { name?: string; isActive?: boolean; sortOrder?: number },
  ): Promise<{ language: PricingLanguage }>;
  createPricingVersion(input: CreatePricingVersionInput): Promise<{ version: PricingVersion }>;
  pricingVersion(id: string): Promise<{ version: PricingVersion; matrix: PricingMatrixRow[] }>;
  cancelPricingVersion(id: string): Promise<{ version: PricingVersion }>;
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
    dashboardCards: () => request('/admin/dashboard/section/cards'),
    files: (uploader, offset, scope) => request(`/admin/files${q({ uploader, offset, scope })}`),
    users: (query, offset) => request(`/admin/users${q({ q: query, offset })}`),
    userDetail: (id) => request(`/admin/users/${encodeURIComponent(id)}`),
    updateUserAccessStatus: (id, input) =>
      request(`/admin/users/${encodeURIComponent(id)}/access-status`, {
        method: 'PATCH',
        body: input,
      }),
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
    pricingCatalog: () => request('/admin/pricing/catalog'),
    createPricingType: (input) => request('/admin/pricing/types', { method: 'POST', body: input }),
    updatePricingType: (id, patch) =>
      request(`/admin/pricing/types/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    createPricingLanguage: (input) =>
      request('/admin/pricing/languages', { method: 'POST', body: input }),
    updatePricingLanguage: (id, patch) =>
      request(`/admin/pricing/languages/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    createPricingVersion: (input) =>
      request('/admin/pricing/versions', { method: 'POST', body: input }),
    pricingVersion: (id) => request(`/admin/pricing/versions/${encodeURIComponent(id)}`),
    cancelPricingVersion: (id) =>
      request(`/admin/pricing/versions/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  };
}
