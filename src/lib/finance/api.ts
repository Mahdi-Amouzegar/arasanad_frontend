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

export type PaymentPurpose = 'wallet_topup' | 'order_deposit' | 'order_final';
export type PaymentRail = 'manual' | 'online';

export interface PendingPayment {
  id: string;
  purpose: PaymentPurpose;
  projectId: string | null;
  stage: string | null;
  rail: PaymentRail;
  status: string;
  declaredAmount?: number;
  paymentReference?: string | null;
  createdAt?: string;
  agingDays?: number;
  [key: string]: unknown;
}

export interface PaymentIntent {
  intentId: string;
  purpose: PaymentPurpose;
  projectId: string | null;
  stage: string | null;
  rail: PaymentRail;
  amount: number;
  paymentReference: string;
  bankName: string;
  dedupeKey: string;
  authority: string | null;
  redirectUrl: string | null;
  onlineEnabled: boolean;
  expiresAt: string;
  serverTime: string;
}

export interface PaymentConfig {
  onlineEnabled: boolean;
  bankName: string;
  purposes: PaymentPurpose[];
  rails: PaymentRail[];
}

export interface SavedPaymentReference {
  id: string;
  label: string;
  referenceMask: string;
  bankName: string | null;
  kind: 'deposit_reference' | 'refund_account';
  createdAt: string;
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
  wallet(): Promise<{
    wallet: WalletSummary;
    transactions: WalletTransaction[];
    payments: PendingPayment[];
  }>;
  adminPayments(purpose?: PaymentPurpose | 'all'): Promise<{ pending: PendingPayment[]; serverTime: string }>;
  adminWallets(): Promise<{ wallets: WalletRow[]; serverTime: string }>;
  adminRefunds(): Promise<{ refunds: RefundRequestView[]; serverTime: string }>;
  reconciliation(): Promise<ReconciliationView>;
  paymentConfig(): Promise<PaymentConfig>;
  createPaymentIntent(input: {
    purpose: PaymentPurpose;
    rail: PaymentRail;
    amount?: number;
    projectId?: string | null;
    stage?: 'deposit' | 'final';
    clientNonce?: string;
  }): Promise<PaymentIntent>;
  attachPaymentReceipt(id: string, fileIds: string[], note?: string): Promise<unknown>;
  listPaymentReferences(): Promise<{ references: SavedPaymentReference[] }>;
  savePaymentReference(input: {
    label: string;
    reference: string;
    bankName?: string;
    kind?: 'deposit_reference' | 'refund_account';
  }): Promise<{ saved: boolean; referenceMask: string }>;
  updatePaymentReference(id: string, label: string, bankName?: string): Promise<unknown>;
  deletePaymentReference(id: string): Promise<unknown>;
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
        payments?: PendingPayment[];
      }>('/wallet');
      return {
        wallet: {
          available: Number(data.wallet?.available ?? 0) || 0,
          reserved: Number(data.wallet?.reserved ?? 0) || 0,
        },
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        payments: Array.isArray(data.payments) ? data.payments : [],
      };
    },
    async adminPayments(purpose = 'all') {
      const suffix = purpose === 'all' ? '' : `?purpose=${encodeURIComponent(purpose)}`;
      const data = await request<{ pending: PendingPayment[]; serverTime: string }>(`/admin/payments${suffix}`);
      return {
        pending: Array.isArray(data.pending) ? data.pending : [],
        serverTime: data.serverTime,
      };
    },
    async paymentConfig() {
      const data = await request<PaymentConfig>('/payments/config');
      return {
        onlineEnabled: Boolean(data.onlineEnabled),
        bankName: String(data.bankName ?? ''),
        purposes: Array.isArray(data.purposes) ? data.purposes : [],
        rails: Array.isArray(data.rails) ? data.rails : [],
      };
    },
    createPaymentIntent(input) {
      return request<PaymentIntent>('/payment-intents', {
        method: 'POST',
        body: input,
      });
    },
    attachPaymentReceipt(id, fileIds, note) {
      return request(`/payment-requests/${encodeURIComponent(id)}/receipts`, {
        method: 'POST',
        body: { fileIds, note },
      });
    },
    async listPaymentReferences() {
      const data = await request<{ references: SavedPaymentReference[] }>('/payment-references');
      return { references: Array.isArray(data.references) ? data.references : [] };
    },
    savePaymentReference(input) {
      return request<{ saved: boolean; referenceMask: string }>('/payment-references', {
        method: 'POST',
        body: input,
      });
    },
    updatePaymentReference(id, label, bankName) {
      return request(`/payment-references/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { label, bankName },
      });
    },
    deletePaymentReference(id) {
      return request(`/payment-references/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: {},
      });
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
