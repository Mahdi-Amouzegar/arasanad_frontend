/**
 * فاز ۱۰ — کلاینت تایپشده پنلهای مالی. تمام پاسخها بیتوجه به شکل
 * سرور پاک‌سازی می‌شوند و شناسه‌ها پیش از ارسال URL-encode می‌گردند.
 */

export interface WalletSummary {
  available: number;
  reserved: number;
}

export interface WalletTransaction {
  id: string;
  userId?: string;
  kind: string;
  amount: number;
  projectId?: string | null;
  paymentRequestId?: string | null;
  createdAt?: string;
}

export interface PendingPayment {
  id: string;
  projectId: string;
  stage: string;
  rail: string;
  status: string;
  declaredAmount?: number;
  paymentReference?: string | null;
  createdAt?: string;
  agingDays?: number;
  [key: string]: unknown;
}

export interface WalletRow {
  user_id: string;
  available: number;
  reserved: number;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ReconciliationProject {
  projectId: string;
  code: string;
  escrowBalance: number;
  settledAmount: number;
  status: string;
}

export interface RefundRequestView {
  id: string;
  projectId: string;
  amount: number;
  kind: string;
  status: string;
  trackingNo: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface ReconciliationView {
  totals: Record<string, number>;
  equation: Record<string, unknown>;
  projects: ReconciliationProject[];
  serverTime: string;
}

export type AuthedRequest = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown },
) => Promise<T>;

export interface FinanceApi {
  wallet(): Promise<{ wallet: WalletSummary; transactions: WalletTransaction[] }>;
  adminPayments(): Promise<{ pending: PendingPayment[]; serverTime: string }>;
  adminWallets(): Promise<{ wallets: WalletRow[]; serverTime: string }>;
  adminRefunds(): Promise<{ refunds: RefundRequestView[]; serverTime: string }>;
  reconciliation(): Promise<ReconciliationView>;
  approvePayment(id: string, amount: number, fileIds?: string[]): Promise<unknown>;
  rejectPayment(id: string): Promise<unknown>;
  requestRefund(projectId: string, amount: number, kind: 'bank' | 'wallet'): Promise<unknown>;
  decideRefund(id: string, decision: 'paid' | 'cancelled', trackingNo?: string): Promise<unknown>;
}

export function createFinanceApi(request: AuthedRequest): FinanceApi {
  return {
    async wallet() {
      const data = await request<{
        wallet: WalletSummary;
        transactions: WalletTransaction[];
      }>('/wallet');
      return {
        wallet: {
          available: Number(data.wallet?.available ?? 0) || 0,
          reserved: Number(data.wallet?.reserved ?? 0) || 0,
        },
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
      };
    },
    async adminPayments() {
      const data = await request<{ pending: PendingPayment[]; serverTime: string }>('/admin/payments');
      return {
        pending: Array.isArray(data.pending) ? data.pending : [],
        serverTime: data.serverTime,
      };
    },
    async adminWallets() {
      const data = await request<{ wallets: WalletRow[]; serverTime: string }>('/admin/wallets');
      return {
        wallets: Array.isArray(data.wallets) ? data.wallets : [],
        serverTime: data.serverTime,
      };
    },
    async adminRefunds() {
      const data = await request<{ refunds: RefundRequestView[]; serverTime: string }>('/admin/refunds');
      return {
        refunds: Array.isArray(data.refunds) ? data.refunds : [],
        serverTime: data.serverTime,
      };
    },
    async reconciliation() {
      const data = await request<ReconciliationView>('/admin/reconciliation');
      return {
        totals: data.totals ?? {},
        equation: data.equation ?? {},
        projects: Array.isArray(data.projects) ? data.projects : [],
        serverTime: data.serverTime,
      };
    },
    approvePayment(id, amount, fileIds = []) {
      return request(`/payment-requests/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: { amount, fileIds },
      });
    },
    rejectPayment(id) {
      return request(`/payment-requests/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: {},
      });
    },
    requestRefund(projectId, amount, kind) {
      return request(`/projects/${encodeURIComponent(projectId)}/refunds`, {
        method: 'POST',
        body: { amount, kind },
      });
    },
    decideRefund(id, decision, trackingNo) {
      return request(`/refunds/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        body: trackingNo ? { decision, trackingNo } : { decision },
      });
    },
  };
}
