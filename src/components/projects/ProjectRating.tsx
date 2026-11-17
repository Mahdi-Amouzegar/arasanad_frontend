'use client';

/**
 * فاز ۱۲٫۵-ج-۱ — امتیاز مشتری به سفارش تکمیل‌شده.
 *
 * ⚠️ `canRate` دقیقاً از سرور می‌آید؛ هیچ شرطی در رابط تکرار نمی‌شود.
 * ⚠️ پس از ثبت، دکمه به «امتیاز ثبت شد» تبدیل می‌شود و امتیاز دومبهheid
 *    توسط قید UNIQUE دیتابیس رد می‌گردد.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { createRatingsApi, type RatingStatus } from '@/lib/ratings/api';
import { errorText } from './ui-utils';

export function ProjectRating({ projectId }: { projectId: string }) {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createRatingsApi(authedRequest), [authedRequest]);
  const [state, setState] = useState<RatingStatus | null>(null);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!projectId) return;
    void api.status(projectId)
      .then(setState)
      .catch(() => setState(null));
  }, [api, projectId]);

  useEffect(load, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const next = await api.submit(projectId, score, comment);
      setState(next);
      showToast({ type: 'success', title: 'امتیاز ثبت شد' });
    } catch (caught) {
      showToast({ type: 'error', title: 'ثبت امتیاز انجام نشد', message: errorText(caught, 'خطای ناشناخته') });
    } finally {
      setBusy(false);
    }
  };

  if (!state || (!state.canRate && !state.rating)) return null;

  return (
    <Card>
      <CardHeader
        title="امتیاز شما به سفارش"
        actions={
          state.summary.count > 0 ? (
            <Badge tone="info">
              میانگین {state.summary.average?.toLocaleString('fa-IR') ?? '—'} از ۵
            </Badge>
          ) : undefined
        }
      />
      <CardBody>
        {state.rating ? (
          <div className="prj-stack">
            <div className="prj-action-cell">
              <Button type="button" variant="outline" size="sm" disabled>
                <Icon name="checkCircle" size={15} />
                امتیاز ثبت شد
              </Button>
              <strong>{state.rating.score} از ۵</strong>
            </div>
            {state.rating.comment ? <p className="prj-note">{state.rating.comment}</p> : null}
            <p className="prj-note">
              ثبت‌شده در <JalaliDate value={state.rating.createdAt} variant="short" />
            </p>
          </div>
        ) : (
          <form className="prj-stack" onSubmit={(event) => void submit(event)}>
            <p className="prj-note">پس از تکمیل سفارش می‌توانید یک بار امتیاز خود را ثبت کنید.</p>
            <div className="prj-action-cell" role="group" aria-label="امتیاز ۱ تا ۵">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={value === score ? 'primary' : 'outline'}
                  aria-pressed={value === score}
                  onClick={() => setScore(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
            <Textarea
              aria-label="توضیح اختیاری امتیاز"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="توضیح اختیاری درباره کیفیت کار (حداکثر ۱۰۰۰ نویسه)"
            />
            <div>
              <Button type="submit" variant="primary" size="sm" loading={busy} disabled={busy}>
                ثبت امتیاز
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
