'use client';

import { useMemo, type ReactNode } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Timeline } from '@/components/ui/Timeline';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import type { Project } from '@/lib/projects/api';
import {
  buildOrderWorkflow,
  isStageInteractive,
  type StepTarget,
  type WorkflowRole,
} from '@/lib/order-workflow';

interface OrderTimelineProps {
  project: Project;
  role: WorkflowRole;
  /** دکمهٔ اصلی همان عملیات موجود سامانه — از صفحهٔ جزئیات تزریق می‌شود. */
  primaryAction?: ReactNode;
}

const RESPONSIBLE_LABEL: Record<'admin' | 'customer' | 'system', string> = {
  admin: 'مدیر',
  customer: 'سفارش‌دهنده',
  system: 'سیستم',
};

/**
 * لایهٔ اختصاصی سفارش روی کامپوننت پایه Timeline.
 * تمام منطق نقش/مسیر/پرداخت در `buildOrderWorkflow` است؛ اینجا فقط رندر و
 * هدایت کلیک به کارت مربوطه انجام می‌شود.
 */
export function OrderTimeline({ project, role, primaryAction }: OrderTimelineProps) {
  const workflow = useMemo(() => buildOrderWorkflow(project, role), [project, role]);

  const activate = (target: StepTarget) => {
    if (typeof window === 'undefined') return;
    if (target.kind === 'anchor') {
      document
        .getElementById(target.id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (target.kind === 'operations') {
      const prefix = role === 'admin' ? 'admin' : 'panel';
      window.location.assign(
        `/${prefix}/projects/operations/?id=${encodeURIComponent(project.id)}` +
          `&activity=${encodeURIComponent(target.activityId)}`,
      );
    }
  };

  return (
    <Card>
      <CardHeader title="مسیر سفارش" />
      <CardBody>
        <div id="prj-workflow" className="order-timeline">
          <Timeline
            steps={workflow.steps}
            size="md"
            ariaLabel="مراحل گردش کار سفارش"
            onStepClick={(step) => {
              if (!isStageInteractive(step)) return;
              const target = workflow.targets[step.id];
              if (target) activate(target);
            }}
          />

          <div className="order-timeline__summary" role="status" aria-live="polite">
            <div className="order-timeline__summary-main">
              <strong className="order-timeline__summary-title">
                {workflow.summary.title}
              </strong>
              <p className="order-timeline__summary-desc">{workflow.summary.description}</p>
              <p className="order-timeline__summary-action">
                <Icon name="activity" size={16} />
                {workflow.summary.action}
              </p>
            </div>
            <dl className="order-timeline__facts">
              <div>
                <dt>مسئول اقدام</dt>
                <dd>{RESPONSIBLE_LABEL[workflow.summary.responsible]}</dd>
              </div>
              <div>
                <dt>آخرین تغییر</dt>
                <dd>
                  {workflow.summary.lastChange ? (
                    <JalaliDate value={workflow.summary.lastChange} />
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>مهلت تحویل</dt>
                <dd>
                  {workflow.summary.deadline ? (
                    <JalaliDate value={workflow.summary.deadline} />
                  ) : (
                    'پس از تأیید بیعانه'
                  )}
                </dd>
              </div>
            </dl>
            {primaryAction ? (
              <div className="order-timeline__action">{primaryAction}</div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
