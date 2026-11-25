'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { registerBackDismiss } from '@/lib/android-back';

/* ─────────────────────────── انواع ─────────────────────────── */

export type AlertType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'confirm'
  | 'danger-confirm'
  | 'loading';

export interface AlertOptions {
  type: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** فاز ۱۲٫۳۱ — دریافت دلیل تغییر در همان تأییدیه (بدون پنجرهٔ موازی). */
  reason?: { label: string; defaultValue: string; minLength?: number };
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
}

interface AlertApi {
  /** نمایش هشدار یا گرفتن تأیید. خروجی: آیا کاربر تأیید کرد؟ */
  showAlert: (options: AlertOptions) => Promise<boolean>;
  /** تأیید همراه با دلیل قابلویرایش؛ مقدار خالی پذیرفته نمی‌شود. */
  confirmWithReason: (
    options: AlertOptions & { reason: { label: string; defaultValue: string; minLength?: number } },
  ) => Promise<{ confirmed: boolean; reason: string }>;
  /** اطلاع کوتاه و گذرا */
  showToast: (options: ToastOptions) => void;
}

const AlertContext = createContext<AlertApi | null>(null);

const TYPE_META: Record<AlertType, { icon: IconName; tone: string }> = {
  success: { icon: 'checkCircle', tone: 'success' },
  error: { icon: 'alert', tone: 'danger' },
  warning: { icon: 'alert', tone: 'warning' },
  info: { icon: 'message', tone: 'info' },
  confirm: { icon: 'message', tone: 'primary' },
  'danger-confirm': { icon: 'alert', tone: 'danger' },
  loading: { icon: 'refresh', tone: 'primary' },
};

/* ─────────────────────────── Provider ─────────────────────────── */

export function AlertProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const reasonRef = useRef('');
  const [toasts, setToasts] = useState<Array<ToastOptions & { id: number }>>([]);
  const toastId = useRef(0);
  const toastHostRef = useRef<HTMLDivElement>(null);

  /**
   * فاز ۱۲٫۸-د: دیالوگهای بومی (`<dialog showModal>`) در «لایهٔ بالا»ی مرورگر
   * قرار می‌گیرند و هیچ z-index نمی‌تواند toast معمولی را بالای مودال قرار دهد.
   * با تبدیل میزبان toast به popover دستی، آن هم وارد لایهٔ بالا می‌شود و
   * بر روی تمام مودالها (فایل، اقدام، بازبینی و…) دیده می‌شود — یک راهکار
   * واحد برای تمام پنجرهها، بدون تغییر تکتک مودالها.
   */
  useEffect(() => {
    const host = toastHostRef.current;
    if (!host) return;
    const canPopover =
      typeof (host as HTMLElement & { showPopover?: () => void }).showPopover === 'function';
    if (!canPopover) return;
    const el = host as HTMLElement & {
      showPopover: () => void;
      hidePopover: () => void;
      matches: (s: string) => boolean;
    };
    if (toasts.length > 0) {
      if (!el.matches(':popover-open')) el.showPopover();
    } else if (el.matches(':popover-open')) {
      el.hidePopover();
    }
  }, [toasts]);

  const showAlert = useCallback((options: AlertOptions) => {
    resolverRef.current?.(false);
    setReasonInput('');
    reasonRef.current = '';
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setAlert(options);
    });
  }, []);

  const confirmWithReason = useCallback(
    async (options: AlertOptions & { reason: { label: string; defaultValue: string; minLength?: number } }) => {
      const pending = showAlert(options);
      reasonRef.current = options.reason.defaultValue;
      setReasonInput(options.reason.defaultValue);
      const confirmed = await pending;
      return { confirmed, reason: reasonRef.current.trim() };
    },
    [showAlert],
  );

  const showToast = useCallback((options: ToastOptions) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((list) => [...list.slice(-2), { ...options, id }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const finish = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setAlert(null);
    resolve?.(result);
  }, []);

  // باز/بسته کردن دیالوگ بومی — خودش تمرکز و Esc و لایه‌ی بالا را مدیریت می‌کند
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (alert) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [alert]);

  // فاز ۱۳: کلید بازگشت اندروید دیالوگهای غیرمسدودکننده را می‌بندد.
  useEffect(() => {
    if (!alert) return undefined;
    const blocking = alert.type === 'loading' || alert.type === 'danger-confirm';
    if (blocking) return undefined;
    return registerBackDismiss(() => {
      finish(false);
      return true;
    });
  }, [alert, finish]);

  const api = useMemo<AlertApi>(
    () => ({ showAlert, confirmWithReason, showToast }),
    [showAlert, confirmWithReason, showToast],
  );

  const meta = alert ? TYPE_META[alert.type] : null;
  const isConfirm = alert?.type === 'confirm' || alert?.type === 'danger-confirm';
  const isBlocking = alert?.type === 'loading' || alert?.type === 'danger-confirm';
  const reasonValid = !alert?.reason
    || reasonInput.trim().length >= (alert.reason.minLength ?? 1);

  return (
    <AlertContext.Provider value={api}>
      {children}

      <dialog
        ref={dialogRef}
        className="alert-dialog"
        aria-labelledby="alert-title"
        aria-describedby={alert?.message ? 'alert-message' : undefined}
        onCancel={(event) => {
          event.preventDefault();
          if (!isBlocking) finish(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current && !isBlocking) finish(false);
        }}
      >
        {alert && meta ? (
          <div className="alert">
            <span className={`alert__icon alert__icon--${meta.tone}`} aria-hidden="true">
              <Icon name={meta.icon} size={22} />
            </span>
            <h2 id="alert-title" className="alert__title">
              {alert.title}
            </h2>
            {alert.message ? (
              <p id="alert-message" className="alert__message">
                {alert.message}
              </p>
            ) : null}

            {alert.reason ? (
              <label className="alert__reason">
                <span>{alert.reason.label}</span>
                <input
                  aria-label={alert.reason.label}
                  value={reasonInput}
                  onChange={(event) => {
                    setReasonInput(event.target.value);
                    reasonRef.current = event.target.value;
                  }}
                />
              </label>
            ) : null}

            {alert.type === 'loading' ? (
              <div className="alert__actions">
                <Button loading block>
                  در حال انجام…
                </Button>
              </div>
            ) : isConfirm ? (
              <div className="alert__actions">
                <Button
                  variant="outline"
                  block
                  autoFocus
                  onClick={() => finish(false)}
                >
                  {alert.cancelText ?? 'انصراف'}
                </Button>
                <Button
                  variant={alert.type === 'danger-confirm' ? 'danger' : 'primary'}
                  block
                  disabled={!reasonValid}
                  onClick={() => finish(true)}
                >
                  {alert.confirmText ?? 'تأیید'}
                </Button>
              </div>
            ) : (
              <div className="alert__actions">
                <Button block onClick={() => finish(true)}>
                  {alert.confirmText ?? 'باشه'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </dialog>

      <div
        ref={toastHostRef}
        className="toast-stack"
        popover="manual"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type ?? 'info'}`}>
            <Icon
              name={
                toast.type === 'success'
                  ? 'checkCircle'
                  : toast.type === 'error'
                    ? 'alert'
                    : 'message'
              }
              size={16}
            />
            <div>
              <p className="toast__title">{toast.title}</p>
              {toast.message ? <p className="toast__message">{toast.message}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

/** دسترسی به سیستم هشدار. فقط داخل AlertProvider معتبر است. */
export function useAlert(): AlertApi {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert باید داخل <AlertProvider> استفاده شود');
  }
  return context;
}
