/** Typed client for the Phase 7 projects API. Public calls use `apiRequest`;
 * authenticated calls are bound to `authedRequest` from `useAuth()`. */

import { apiRequest } from '@/lib/api';
import { publicProjectFields } from './core.mjs';

/* ─────────────────────────── Types ─────────────────────────── */

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
}

export interface DesignPreset {
  id: string;
  name: string;
  description: string | null;
  spec: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

export interface PricingRules {
  urgencyMultiplier: number;
  depositRatio: number;
  roundStep: number;
  deliveryHoursDefault: number;
}

/** Exactly the fields the public endpoint is allowed to expose. */
export interface PublicProject {
  id: string;
  code: string;
  name: string;
  serviceName: string;
  language: string;
  sourceType: string;
  sourcePageCount: number;
  description: string | null;
  createdAt: string;
  status: string;
  deliveryHours: number;
}

export interface ProjectNote {
  id: string;
  text: string;
  authorRole: string;
  createdAt: string;
}

export interface ProjectHistoryItem {
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedByRole: string;
  createdAt: string;
}

/**
 * فاز ۹٫۵: قرارداد اقدامات سرورمحور. فرانت‌اند هیچ دکمهای را خودش
 * تصمیم نمی‌گیرد؛ `href` فقط برای `kind: 'link'` وجود دارد.
 */
export interface ProjectAction {
  id: string;
  label: string;
  kind: 'link' | 'button' | 'status' | 'flag' | 'future';
  href?: string;
  hint?: string;
  /** نام اقدام سرور (declare_payment / approve_payment / dispute_reply / …). */
  intent?: string;
  /** مبلغ پیشپر مودال مالی. */
  amount?: number;
  paymentRequestId?: string | null;
  /** شناسه کارت بازبینی باز، برای replyToActivityId. */
  activityId?: string | null;
  phase?: number;
  primary?: boolean;
}

/** فاز ۱۰ (بند ۲ مالک): بازبینی باز هیچ اثری بر وضعیت سفارش ندارد. */
export interface ProjectOpenDispute {
  activityId: string;
  openedAt: string | null;
  /** متن بازبینی ثبت‌شده توسط سفارش‌دهنده، برای نمایش در دیالوگ پاسخ. */
  text?: string | null;
}

/** فاز ۱۲٫۱۳-و: پاسخ بازبینی تا زمان دیده‌شدن توسط سفارش‌دهنده. */
export interface ProjectDisputeReply {
  activityId: string;
  repliedAt: string | null;
}

export interface ProjectFinanceSummary {
  /** Snapshot اهداف مالی سرور (فاز ۱۰/۱۱). */
  depositTarget?: number;
  finalTarget?: number;
  approvedTotal: number;
  pendingCount: number;
  escrowStatus: string | null;
  downloadUnlocked: boolean;
  /** فاز ۱۲٫۱۵: درخواست واریز در انتظار تأیید و کارت مربوط به آن. */
  pendingPayment?: {
    paymentRequestId: string;
    activityId: string | null;
    amount: number;
    stage: string;
  } | null;
}

/** Owner/admin view — camelCase, exactly as returned by the backend. */
export interface Project {
  id: string;
  code: string;
  name: string;
  serviceTypeId: string;
  serviceName: string;
  language: string;
  sourceType: string;
  description: string | null;
  sourcePageCount: number;
  deliveryHours: number;
  outputFormat: string;
  /** فاز ۱۲٫۳۰: اسنپشوت سروری روش پرداخت؛ مجوز آینده مشتری بیاثر است. */
  paymentMode?: 'cash' | 'credit';
  /** فاز ۱۲٫۲۹: منبع ثبت سفارش (`web` | `tizpa` | `telegram`). */
  sourceChannel?: string;
  specialRequirements: string | null;
  basePricePerPage: number;
  quotedPricePerPage: number | null;
  quoteReason: string | null;
  /** فاز ۱۲٫۱۶: حالت نرخ‌گذاری و جزئیات فرم مبلغ نهایی. */
  quoteMode?: 'total' | 'per_page';
  quoteTotal?: number | null;
  finalPages?: number;
  finalPricePerPage?: number;
  estimateAmount: number;
  depositAmount: number;
  designMode: string;
  designSubmode: string | null;
  designPresetId: string | null;
  designSpec: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  depositPaidAt: string | null;
  deadlineAt: string | null;
  deliveredAt: string | null;
  /** فاز ۱۱ — زمان تکمیل؛ فقط پس از انتقال مدیر به `completed` پر می‌شود. */
  completedAt?: string | null;
  cancelledAt: string | null;
  depositSource: string | null;
  customerId?: string;
  customerDisplayName: string | null;
  /** فاز ۱۲٫۱۰: هویت ثبت‌کننده برای مودال «مشخصات». */
  customerUsername?: string | null;
  customerAvatarUrl?: string | null;
  customerAvatarFileId?: string | null;
  deliveryState: string | null;
  finalTotal: number;
  /** فاز ۹٫۵: اقدامات مجاز همین نقش در همین وضعیت. */
  availableActions?: ProjectAction[];
  /** فاز ۱۰: فلگ بازبینی باز؛ null یعنی پاسخ داده شده یا بازبینیی نیست. */
  openDispute?: ProjectOpenDispute | null;
  disputeReply?: ProjectDisputeReply | null;
  /** فاز ۱۰: خلاصه مالی سرورمحور همان سفارش. */
  finance?: ProjectFinanceSummary | null;
  /** فاز ۱۲٫۲۳-C: موجودی آزاد کیف پول بیننده، فقط برای پیش‌فرض پنجرهٔ تسویه. */
  walletAvailable?: number;
  /** فاز ۱۳: مراحل ردشده توسط انتقال دستی مدیر. */
  skippedStages?: string[] | null;
  /** فاز ۱۳: وجود پرداخت ردشده در وضعیت جاری. */
  rejectedPayment?: boolean;
}

export interface ProjectDetail {
  project: Project;
  history: ProjectHistoryItem[];
  notes: ProjectNote[];
}

export interface CreateProjectDesign {
  mode: 'standard' | 'custom';
  submode?: 'like_original' | 'custom';
  presetId?: string | null;
  spec: Record<string, unknown>;
}

export interface CreateProjectBody {
  name: string;
  serviceTypeId: string;
  language: string;
  sourceType: string;
  description: string;
  sourcePageCount: number;
  deliveryHours: number;
  outputFormat: string | string[];
  /** فاز ۱۲٫۳۰: درخواست روش پرداخت؛ تصمیم نهایی همیشه در بکند است. */
  paymentMode?: 'cash' | 'credit';
  specialRequirements: string;
  design: CreateProjectDesign;
  urgent?: boolean;
  /** فاز ۱۲٫۸-ب: شناسههای فایل/لینک پیوست‌شده هنگام ثبت اولیه (الزامی). */
  fileIds?: string[];
  linkIds?: string[];
}

/**
 * فاز ۱۲٫۲۷: بدنهٔ مجاز ثبت تیزپا. هیچ مبلغ، زبان، فرمت یا نوع مالیای
 * از کلاینت ارسال نمی‌شود؛ سرور تمام پیش‌فرضها و مبالغ را تعیین می‌کند.
 */
export interface CreateTizpaProjectBody {
  name?: string;
  serviceTypeId: string;
  language?: string;
  sourcePageCount: number;
  /** فاز ۱۲٫۳۰: اختیاری؛ در هش Idempotency درخواست منظور می‌شود. */
  outputFormat?: string | string[];
  paymentMode?: 'cash' | 'credit';
  fileIds: string[];
  /** فایل‌های موجود/لینک‌های انتخاب‌شده در پنجرهٔ مشترک مدیریت فایل. */
  linkIds?: string[];
  idempotencyKey: string;
  reservationId?: string | null;
  batchId?: string | null;
}

export interface TizpaCreateResult {
  status: 'completed' | 'processing';
  operationKey: string;
  project?: Project;
  code?: string | null;
  name?: string | null;
  uploadedCount?: number;
  linkedCount?: number;
}

export interface ProjectListFilters {
  status?: string;
  q?: string;
  sort?: 'new' | 'old';
  limit?: number;
  offset?: number;
}

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

/* ─────────────────────────── Public catalog ─────────────────────────── */

export interface LanguageCatalog {
  languages: string[];
  defaultLanguage: string;
}

/** مرجع واحد زبان کار؛ لیست در Frontend کپی نمی‌شود. */
export async function getLanguages(): Promise<LanguageCatalog> {
  const data = await apiRequest<LanguageCatalog>('/languages');
  const languages = Array.isArray(data.languages)
    ? data.languages.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const defaultLanguage = typeof data.defaultLanguage === 'string'
    ? data.defaultLanguage
    : languages[0] ?? '';
  return { languages, defaultLanguage };
}

export async function getServiceTypes(): Promise<ServiceType[]> {
  const data = await apiRequest<{ services: ServiceType[] }>('/service-types');
  return Array.isArray(data.services) ? data.services : [];
}

export async function getDesignPresets(): Promise<DesignPreset[]> {
  const data = await apiRequest<{ presets: DesignPreset[] }>('/design-presets');
  return Array.isArray(data.presets) ? data.presets : [];
}

export async function getPricingRules(): Promise<PricingRules> {
  const data = await apiRequest<{ rules: PricingRules }>('/pricing-rules');
  return data.rules;
}

/**
 * Public list. The defensive client-side filter drops any unexpected key
 * (prices, customerId, contact info) before it ever reaches a component.
 */
export async function getPublicProjects(): Promise<PublicProject[]> {
  const data = await apiRequest<{ projects: unknown[] }>('/projects/public');
  const rows = Array.isArray(data.projects) ? data.projects : [];
  return rows.map(pickPublicProject);
}

function pickPublicProject(value: unknown): PublicProject {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const view: Record<string, unknown> = {};
  for (const key of publicProjectFields) {
    if (Object.hasOwn(source, key)) view[key] = source[key];
  }
  return view as unknown as PublicProject;
}

/** فاز ۱۲٫۶-ت: نمای عمومی یک سفارش — همان کامپوننت فیلتر فهرست. */
export async function getPublicProject(id: string): Promise<PublicProject> {
  const safeId = encodeURIComponent(
    String(id)
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 64),
  );
  const data = await apiRequest<{ project: unknown }>(`/projects/public/${safeId}`);
  return pickPublicProject(data.project);
}

/* ─────────────────────────── Authenticated client ─────────────────────────── */

/** فاز ۱۳: نمای گردش کار سرور — مبنای پنجرههای تقسیم وجه و انتقال دستی. */
export interface ProjectWorkflowView {
  path: 'cash' | 'credit';
  steps: Array<{ id: string; status: string }>;
  currentStageId: string;
  skippedStages: string[];
  allowedManualTargets: string[];
  cancellation: {
    availableAmount: number;
    siteAmount: number;
    walletAmount: number;
    hasFunds: boolean;
    /** فاز ۱۲٫۳۳: منشأ درخواست لغو و قفل سیاست بازپرداخت. */
    origin: 'customer' | 'admin' | 'unknown';
    refundLocked: boolean;
    escrowSettled: boolean;
  };
}

export interface CancelProjectResult {
  project: Project;
  requiresFinancialDecision: boolean;
  cancellationOrigin: 'customer' | 'admin' | 'unknown' | null;
}

export interface ManualTransitionInput {
  status: string;
  skippedStages: string[];
  reason: string;
  note?: string;
  confirm: true;
}

export interface ProjectsApi {
  listProjects(filters?: ProjectListFilters): Promise<Project[]>;
  getProject(id: string): Promise<ProjectDetail>;
  getHistory(id: string): Promise<ProjectHistoryItem[]>;
  addNote(id: string, text: string): Promise<ProjectNote>;
  createProject(body: CreateProjectBody): Promise<Project>;
  createTizpaProject(body: CreateTizpaProjectBody): Promise<TizpaCreateResult>;
  submitQuote(
    id: string,
    quotedPricePerPage: number,
    reason: string,
    depositAmount?: number,
    pricingMode?: 'total' | 'per_page',
  ): Promise<Project>;
  acceptQuote(id: string): Promise<Project>;
  requestQuoteReview(id: string): Promise<Project>;
  cancelProject(id: string, reason: string): Promise<CancelProjectResult>;
  decideCancel(
    id: string,
    approve: boolean,
    reason: string,
    split?: { siteAmount: number; walletAmount: number },
  ): Promise<Project>;
  changeStatus(id: string, status: string, reason: string): Promise<Project>;
  getWorkflow(id: string): Promise<ProjectWorkflowView>;
  manualTransition(id: string, input: ManualTransitionInput): Promise<Project>;
}

function projectPath(id: string, suffix = ''): string {
  return `/projects/${encodeURIComponent(id)}${suffix}`;
}

export function createProjectsApi(request: AuthedRequest): ProjectsApi {
  return {
    async listProjects(filters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.q) params.set('q', filters.q);
      params.set('sort', filters.sort ?? 'new');
      if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));
      if (typeof filters.offset === 'number')
        params.set('offset', String(filters.offset));
      const data = await request<{ projects: Project[] }>(
        `/projects?${params.toString()}`,
      );
      return Array.isArray(data.projects) ? data.projects : [];
    },

    async getProject(id) {
      const data = await request<ProjectDetail>(projectPath(id));
      return {
        project: data.project,
        history: Array.isArray(data.history) ? data.history : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
      };
    },

    async getHistory(id) {
      const data = await request<{ history: ProjectHistoryItem[] }>(
        projectPath(id, '/history'),
      );
      return Array.isArray(data.history) ? data.history : [];
    },

    async addNote(id, text) {
      const data = await request<{ note: ProjectNote }>(projectPath(id, '/notes'), {
        method: 'POST',
        body: { text },
      });
      return data.note;
    },

    async createProject(body) {
      const data = await request<{ project: Project }>('/projects', {
        method: 'POST',
        body,
      });
      return data.project;
    },

    async createTizpaProject(body) {
      return request<TizpaCreateResult>('/projects/tizpa', {
        method: 'POST',
        body,
      });
    },

    async submitQuote(id, quotedPricePerPage, reason, depositAmount, pricingMode) {
      const data = await request<{ project: Project }>(projectPath(id, '/quote'), {
        method: 'POST',
        body: {
          quotedPricePerPage,
          reason,
          depositAmount,
          pricingMode: pricingMode ?? 'per_page',
        },
      });
      return data.project;
    },

    async acceptQuote(id) {
      const data = await request<{ project: Project }>(projectPath(id, '/quote/accept'), {
        method: 'POST',
      });
      return data.project;
    },

    async requestQuoteReview(id) {
      const data = await request<{ project: Project }>(projectPath(id, '/quote/review'), {
        method: 'POST',
      });
      return data.project;
    },

    async cancelProject(id, reason) {
      return request<CancelProjectResult>(projectPath(id, '/cancel'), {
        method: 'POST',
        body: { reason },
      });
    },

    async decideCancel(id, approve, reason, split) {
      const data = await request<{ project: Project }>(
        projectPath(id, '/cancel/decision'),
        {
          method: 'POST',
          body: {
            approve,
            reason,
            ...(split && approve
              ? { siteAmount: split.siteAmount, walletAmount: split.walletAmount }
              : {}),
          },
        },
      );
      return data.project;
    },

    async changeStatus(id, status, reason) {
      const data = await request<{ project: Project }>(projectPath(id, '/status'), {
        method: 'POST',
        body: { status, reason },
      });
      return data.project;
    },

    async getWorkflow(id) {
      return request<ProjectWorkflowView>(projectPath(id, '/workflow'));
    },

    async manualTransition(id, input) {
      const data = await request<{ project: Project }>(
        projectPath(id, '/manual-transition'),
        { method: 'POST', body: input },
      );
      return data.project;
    },
  };
}
