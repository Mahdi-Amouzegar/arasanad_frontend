import type { TimelineStep, TimelineStepStatus } from '../components/ui/Timeline';
import { PROJECT_STATUS, type ProjectStatus } from './status';

/**
 * لایهٔ اختصاصی گردش کار سفارش.
 *
 * ⚠️ این تنها جایی است که «وضعیت سفارش» به «مراحل نمایشی» تبدیل می‌شود.
 *    کامپوننت پایه Timeline هیچ‌یک از این مفاهیم را نمیشناسد.
 *    این ماژول خالص است: فقط ورودی می‌گیرد و خروجی می‌سازد، نه API می‌خواند
 *    و نه وضعیتی را تغییر می‌دهد.
 */

export type WorkflowRole = 'admin' | 'customer';
export type WorkflowPath = 'cash' | 'credit';
export type StepTarget =
  | { kind: 'anchor'; id: string }
  | { kind: 'operations'; activityId: string }
  | { kind: 'none' };

interface StageDef {
  id: string;
  path: WorkflowPath | 'both';
  title: Record<WorkflowRole, string>;
  description: Record<WorkflowRole, string>;
  responsible: 'admin' | 'customer' | 'system';
  target: StepTarget;
}

const STAGES: StageDef[] = [
  {
    id: 'created',
    path: 'both',
    title: { admin: 'دریافت سفارش', customer: 'ثبت سفارش' },
    description: { admin: 'سفارش وارد صف پردازش شد.', customer: 'سفارش شما ثبت شد.' },
    responsible: 'customer',
    target: { kind: 'anchor', id: 'prj-workflow' },
  },
  {
    id: 'quote',
    path: 'cash',
    title: { admin: 'تعیین نرخ بیعانه', customer: 'انتظار تعیین نرخ' },
    description: {
      admin: 'نرخ و مبلغ بیعانه را ثبت کنید.',
      customer: 'مدیر نرخ و مبلغ بیعانه را تعیین می‌کند.',
    },
    responsible: 'admin',
    target: { kind: 'anchor', id: 'prj-actions' },
  },
  {
    id: 'deposit',
    path: 'cash',
    title: { admin: 'انتظار پرداخت بیعانه', customer: 'پرداخت بیعانه' },
    description: {
      admin: 'منتظر اعلام واریز یا پرداخت آنلاین مشتری هستیم.',
      customer: 'برای آغاز کار، بیعانه را پرداخت یا اعلام واریز کنید.',
    },
    responsible: 'customer',
    target: { kind: 'anchor', id: 'prj-actions' },
  },
  {
    id: 'deposit_confirmation',
    path: 'cash',
    title: { admin: 'بررسی رسید بیعانه', customer: 'در انتظار تأیید بیعانه' },
    description: {
      admin: 'رسید اعلام‌شده را بررسی و تأیید کنید.',
      customer: 'رسید شما در انتظار تأیید مدیر است.',
    },
    responsible: 'admin',
    target: { kind: 'none' },
  },
  {
    id: 'execution',
    path: 'both',
    title: { admin: 'اجرای سفارش', customer: 'در حال اجرا' },
    description: {
      admin: 'کار روی سفارش در حال انجام است.',
      customer: 'کار روی سند شما آغاز شده است.',
    },
    responsible: 'admin',
    target: { kind: 'anchor', id: 'final-files' },
  },
  {
    id: 'final_file',
    path: 'both',
    title: { admin: 'ثبت فایل نهایی', customer: 'آماده‌سازی فایل نهایی' },
    description: {
      admin: 'فایل نهایی را در بخش فایل‌ها ثبت کنید.',
      customer: 'مدیر فایل نهایی را آماده می‌کند.',
    },
    responsible: 'admin',
    target: { kind: 'anchor', id: 'final-files' },
  },
  {
    id: 'final_quote',
    path: 'both',
    title: { admin: 'تعیین نرخ تسویه', customer: 'تعیین مبلغ نهایی' },
    description: {
      admin: 'مبلغ نهایی را بر اساس فایل ثبت‌شده تعیین کنید.',
      customer: 'مدیر مبلغ نهایی را تعیین می‌کند.',
    },
    responsible: 'admin',
    target: { kind: 'anchor', id: 'prj-actions' },
  },
  {
    id: 'final_payment',
    path: 'both',
    title: { admin: 'انتظار تسویه', customer: 'پرداخت نهایی' },
    description: {
      admin: 'منتظر اعلام پرداخت نهایی توسط مشتری هستیم.',
      customer: 'مبلغ نهایی را پرداخت یا اعلام واریز کنید.',
    },
    responsible: 'customer',
    target: { kind: 'anchor', id: 'prj-actions' },
  },
  {
    id: 'settlement_confirmation',
    path: 'both',
    title: { admin: 'بررسی و تأیید تسویه', customer: 'تأیید تسویه' },
    description: {
      admin: 'رسید تسویه را بررسی و تأیید کنید.',
      customer: 'تسویه اعلام‌شده در انتظار تأیید مدیر است.',
    },
    responsible: 'admin',
    target: { kind: 'none' },
  },
  {
    id: 'delivery',
    path: 'both',
    title: { admin: 'ارسال فایل نهایی', customer: 'آماده دریافت فایل' },
    description: {
      admin: 'دسترسی مشتری به فایل نهایی را فعال کنید.',
      customer: 'فایل نهایی برای دریافت آماده است.',
    },
    responsible: 'admin',
    target: { kind: 'anchor', id: 'final-files' },
  },
  {
    id: 'completed',
    path: 'both',
    title: { admin: 'تکمیل سفارش', customer: 'دریافت فایل نهایی' },
    description: {
      admin: 'سفارش به پایان رسیده است.',
      customer: 'سفارش تکمیل شد و فایل در اختیار شماست.',
    },
    responsible: 'system',
    target: { kind: 'anchor', id: 'final-files' },
  },
];

const CANCELLATION_STAGE: StageDef = {
  id: 'cancellation',
  path: 'both',
  title: { admin: 'تصمیم دربارهٔ لغو', customer: 'درخواست لغو' },
  description: {
    admin: 'درخواست لغو و تعیین تکلیف وجه را بررسی کنید.',
    customer: 'درخواست لغو شما در انتظار بررسی توسط مدیر است.',
  },
  responsible: 'admin',
  target: { kind: 'anchor', id: 'prj-cancel-decision' },
};

const STATUS_TO_STAGE: Record<ProjectStatus, string> = {
  draft: 'created',
  pending_review: 'quote',
  awaiting_deposit: 'deposit',
  in_progress: 'execution',
  awaiting_final_quote: 'final_quote',
  awaiting_final_payment: 'final_payment',
  awaiting_settlement: 'final_payment',
  awaiting_settlement_confirmation: 'settlement_confirmation',
  ready_for_delivery: 'delivery',
  delivered: 'delivery',
  revision_requested: 'final_file',
  completed: 'completed',
  cancel_requested: 'cancellation',
  cancelled: 'cancellation',
};

export interface OrderWorkflowResult {
  path: WorkflowPath;
  steps: TimelineStep[];
  targets: Record<string, StepTarget>;
  currentStep: TimelineStep | null;
  summary: {
    title: string;
    description: string;
    responsible: 'admin' | 'customer' | 'system';
    action: string;
    lastChange: string | null;
    deadline: string | null;
    target: StepTarget;
  };
}

/** ورودی مینیمال؛ بدون وابستگی به شکل کامل پاسخ API. */
export interface OrderWorkflowInput {
  status: string;
  paymentMode?: 'cash' | 'credit' | null;
  updatedAt?: string | null;
  deadlineAt?: string | null;
  skippedStages?: string[] | null;
  rejectedPayment?: boolean;
  pendingPaymentStage?: string | null;
  pendingActivityId?: string | null;
}

/** ساختار مینیمالی که از پاسخ API سفارش موردنیاز است. */
export interface ProjectLike extends OrderWorkflowInput {
  finance?: {
    pendingPayment?: { stage?: string | null; activityId?: string | null } | null;
  } | null;
}

function isProjectStatus(value: string): value is ProjectStatus {
  return Object.prototype.hasOwnProperty.call(PROJECT_STATUS, value);
}

function stageIndex(stages: StageDef[], input: OrderWorkflowInput): number {
  const status = isProjectStatus(input.status) ? input.status : 'draft';
  let id = STATUS_TO_STAGE[status];

  // پرداخت اعلام‌شده ولی تأییدنشده: مرحلهٔ بعدی (تأیید) جاری است.
  if (status === 'awaiting_deposit' && input.pendingPaymentStage === 'deposit') {
    id = 'deposit_confirmation';
  }
  if (status === 'awaiting_settlement' && input.pendingPaymentStage === 'final') {
    id = 'settlement_confirmation';
  }
  const index = stages.findIndex((stage) => stage.id === id);
  return index < 0 ? 0 : index;
}

function titleFor(stage: StageDef, role: WorkflowRole, status: string): string {
  if (status === 'revision_requested' && stage.id === 'final_file') {
    return role === 'admin' ? 'بازبینی درخواست اصلاح' : 'درخواست اصلاح ثبت شد';
  }
  if (status === 'cancelled') {
    return role === 'admin' ? 'سفارش لغوشده' : 'سفارش لغو شد';
  }
  if (status === 'cancel_requested' && stage.id === 'cancellation') {
    return role === 'admin' ? 'درخواست لغو — نیاز به تصمیم' : 'درخواست لغو ارسال شد';
  }
  return stage.title[role];
}

function targetFor(
  stage: StageDef,
  input: OrderWorkflowInput,
  role: WorkflowRole,
): StepTarget {
  if (stage.target.kind === 'operations') return stage.target;
  if (
    (stage.id === 'deposit_confirmation' || stage.id === 'settlement_confirmation') &&
    input.pendingActivityId
  ) {
    return { kind: 'operations', activityId: input.pendingActivityId };
  }
  if (stage.id === 'cancellation' && role !== 'admin') {
    return { kind: 'anchor', id: 'prj-workflow' };
  }
  return stage.target;
}


/** تبدیل وضعیت واقعی سفارش به مراحل قابل نمایش توسط کامپوننت پایه. */
export function buildOrderWorkflow(
  project: OrderWorkflowInput | ProjectLike,
  role: WorkflowRole,
): OrderWorkflowResult {
  const financePending = (project as ProjectLike).finance?.pendingPayment;
  const input: OrderWorkflowInput = {
    status: project.status,
    paymentMode: project.paymentMode,
    updatedAt: project.updatedAt,
    deadlineAt: project.deadlineAt,
    skippedStages: project.skippedStages ?? [],
    rejectedPayment: project.rejectedPayment ?? false,
    pendingPaymentStage: project.pendingPaymentStage ?? financePending?.stage ?? null,
    pendingActivityId: project.pendingActivityId ?? financePending?.activityId ?? null,
  };

  const path: WorkflowPath = input.paymentMode === 'credit' ? 'credit' : 'cash';
  const base = STAGES.filter((stage) => stage.path === 'both' || stage.path === path);
  const cancelled = input.status === 'cancelled';
  const cancelRequested = input.status === 'cancel_requested';
  const stages = cancelRequested || cancelled ? [...base, CANCELLATION_STAGE] : base;
  const index = stageIndex(stages, input);
  const skipped = new Set((input.skippedStages ?? []).filter((id) => typeof id === 'string'));
  const targets: Record<string, StepTarget> = {};
  const steps: TimelineStep[] = [];

  stages.forEach((stage, i) => {
    const isCancellation = stage.id === 'cancellation';
    let status: TimelineStepStatus;
    if (isCancellation) {
      status = cancelled ? 'cancelled' : 'current';
    } else if (i < index) {
      status = 'completed';
    } else if (i === index) {
      status = cancelled ? 'completed' : 'current';
    } else {
      status = cancelled ? 'disabled' : 'upcoming';
    }
    if (skipped.has(stage.id)) status = 'skipped';
    if (
      input.rejectedPayment &&
      i === index &&
      (stage.id === 'deposit' || stage.id === 'final_payment')
    ) {
      status = 'error';
    }
    const target = targetFor(stage, input, role);
    targets[stage.id] = target;
    steps.push({
      id: stage.id,
      title: titleFor(stage, role, input.status),
      description: stage.description[role],
      status,
      disabled: status === 'upcoming' || status === 'disabled' || target.kind === 'none',
    });
  });

  const currentStep = steps.find((step) => step.status === 'current') ?? null;
  const currentStage = stages.find((stage) => stage.id === currentStep?.id) ?? stages[index] ?? stages[0];
  const meta = isProjectStatus(input.status) ? PROJECT_STATUS[input.status] : undefined;

  return {
    path,
    steps,
    targets,
    currentStep,
    summary: {
      title: currentStep?.title ?? (cancelled ? 'سفارش لغوشده' : 'وضعیت نامشخص'),
      description:
        currentStep?.description ??
        meta?.description ??
        'برای نمایش جزئیات وضعیت، سفارش را بارگذاری مجدد کنید.',
      responsible: currentStage?.responsible ?? 'system',
      action: meta?.needsCustomerAction
        ? 'اقدام سفارش‌دهنده لازم است'
        : currentStage?.responsible === 'admin'
          ? 'اقدام مدیر لازم است'
          : 'نیاز به اقدام فوری نیست',
      lastChange: input.updatedAt ?? null,
      deadline: input.deadlineAt ?? null,
      target: currentStep ? targets[currentStep.id] ?? { kind: 'none' } : { kind: 'none' },
    },
  };
}

/** آیا مرحلهای قابل کلیک است؟ مراحل جاری/تکمیل‌شده/ردشده جزئیات می‌دهد. */
export function isStageInteractive(step: TimelineStep): boolean {
  return (
    !step.disabled &&
    (step.status === 'current' ||
      step.status === 'completed' ||
      step.status === 'skipped' ||
      step.status === 'cancelled' ||
      step.status === 'error')
  );
}
