/**
 * فاز ۱۲٫۵ — کلاینت تایپشده‌ی خواندن داشبورد پنل مشتری.
 * تمام پاسخها پاک‌سازی می‌شوند تا مقدار ناشناخته به رابط راه نیابد.
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

export interface DashboardAction {
  id: string;
  code: string;
  name: string;
  status: string;
  label: string;
  href: string;
  amount: number;
}

export interface DashboardProject {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  estimate: number;
}

export interface DashboardConversation {
  id: string;
  projectId: string | null;
  projectName: string;
  updatedAt: string;
}

export interface CustomerDashboardView {
  cards: DashboardCard[];
  actions: DashboardAction[];
  recentProjects: DashboardProject[];
  wallet: { available: number; reserved: number };
  pendingPayments: number;
  conversations: DashboardConversation[];
  serverTime: string;
}

/* ───────────────────────── فاز ۱۲٫۵-ت: فایل‌های من ───────────────────────── */

export type FileFilterId = 'all' | 'project' | 'delivery' | 'receipt';
export type CustomerFileScope = FileFilterId | 'other';

export interface PanelFileItem {
  id: string;
  uploaderId: string;
  originalName: string;
  fileCode: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: 'pending' | 'uploaded' | 'failed' | 'deleted';
  description: string | null;
  downloadCount: number;
  createdAt: string;
  uploadedAt: string | null;
}

export interface CustomerFileEntry {
  file: PanelFileItem;
  scope: CustomerFileScope;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  relationRole: string | null;
  relationEntityId: string;
  relatedAt: string;
  /** تصمیم سرور — کلاینت مجوز دانلود را خود محاسبه نمی‌کند. */
  canDownload: boolean;
  lockedMessage: string | null;
}

export interface CustomerFileFilter {
  id: FileFilterId;
  label: string;
  count: number;
}

export interface CustomerFilesView {
  filters: CustomerFileFilter[];
  scope: FileFilterId;
  files: CustomerFileEntry[];
  serverTime: string;
}

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const safeHref = (value: unknown): string => {
  const href = text(value);
  return href.startsWith('/') && !href.startsWith('//') ? href : '/panel/projects/';
};
const bool = (value: unknown): boolean => value === true;
const nullableText = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;
const FILE_FILTER_IDS: FileFilterId[] = ['all', 'project', 'delivery', 'receipt'];
const FILE_SCOPES: CustomerFileScope[] = ['all', 'project', 'delivery', 'receipt', 'other'];

function sanitizeFile(value: unknown): PanelFileItem {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: text(row.id),
    uploaderId: text(row.uploaderId),
    originalName: text(row.originalName),
    fileCode: text(row.fileCode),
    mimeType: text(row.mimeType),
    extension: text(row.extension),
    sizeBytes: num(row.sizeBytes),
    status: (['pending', 'uploaded', 'failed', 'deleted'] as string[]).includes(text(row.status))
      ? (row.status as PanelFileItem['status'])
      : 'pending',
    description: nullableText(row.description),
    downloadCount: num(row.downloadCount),
    createdAt: text(row.createdAt),
    uploadedAt: nullableText(row.uploadedAt),
  };
}

export function createPanelApi(request: AuthedRequest) {
  return {
    async dashboard(): Promise<CustomerDashboardView> {
      // `authedRequest` پاکت موفقیت را باز می‌کند؛ data همان بدنه سرور است.
      const data = await request<Partial<CustomerDashboardView>>('/panel/dashboard');
      return {
        cards: (Array.isArray(data.cards) ? data.cards : []).map((card) => ({
          id: text(card.id),
          label: text(card.label),
          value: num(card.value),
          href: safeHref(card.href),
        })),
        actions: (Array.isArray(data.actions) ? data.actions : []).map((action) => ({
          id: text(action.id),
          code: text(action.code),
          name: text(action.name),
          status: text(action.status),
          label: text(action.label),
          href: safeHref(action.href),
          amount: num(action.amount),
        })),
        recentProjects: (Array.isArray(data.recentProjects) ? data.recentProjects : []).map((row) => ({
          id: text(row.id),
          code: text(row.code),
          name: text(row.name),
          status: text(row.status),
          createdAt: text(row.createdAt),
          estimate: num(row.estimate),
        })),
        wallet: {
          available: num(data.wallet?.available),
          reserved: num(data.wallet?.reserved),
        },
        pendingPayments: num(data.pendingPayments),
        conversations: (Array.isArray(data.conversations) ? data.conversations : []).map((row) => ({
          id: text(row.id),
          projectId: typeof row.projectId === 'string' ? row.projectId : null,
          projectName: text(row.projectName, 'گفتگو'),
          updatedAt: text(row.updatedAt),
        })),
        serverTime: text(data.serverTime),
      };
    },

    /**
     * فهرست فایل‌های مجاز مشتری. فیلتر و شمارندهها از سرور می‌آیند تا برچسبها
     * و دسترسیها در کلاینت حدس زده نشوند.
     */
    async files(scope: FileFilterId = 'all'): Promise<CustomerFilesView> {
      const query = FILE_FILTER_IDS.includes(scope) ? scope : 'all';
      const data = await request<Partial<CustomerFilesView>>(
        `/panel/files?scope=${encodeURIComponent(query)}`,
      );
      const requested = text(data.scope);
      return {
        filters: (Array.isArray(data.filters) ? data.filters : []).map((filter) => ({
          id: (FILE_FILTER_IDS as string[]).includes(text(filter.id))
            ? (filter.id as FileFilterId)
            : 'all',
          label: text(filter.label),
          count: num(filter.count),
        })),
        scope: (FILE_FILTER_IDS as string[]).includes(requested)
          ? (requested as FileFilterId)
          : query,
        files: (Array.isArray(data.files) ? data.files : []).map((entry) => {
          const row = (entry ?? {}) as unknown as Record<string, unknown>;
          const entryScope = text(row.scope);
          return {
            file: sanitizeFile(row.file),
            scope: (FILE_SCOPES as string[]).includes(entryScope)
              ? (entryScope as CustomerFileScope)
              : 'other',
            projectId: nullableText(row.projectId),
            projectCode: nullableText(row.projectCode),
            projectName: nullableText(row.projectName),
            relationRole: nullableText(row.relationRole),
            relationEntityId: text(row.relationEntityId),
            relatedAt: text(row.relatedAt),
            canDownload: bool(row.canDownload),
            lockedMessage: nullableText(row.lockedMessage),
          };
        }),
        serverTime: text(data.serverTime),
      };
    },
  };
}
