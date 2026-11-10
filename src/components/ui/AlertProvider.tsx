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
  const [toasts, setToasts] = useState<Array<ToastOptions & { id: number }>>([]);
  const toastId = useRef(0);

  const showAlert = useCallback((options: AlertOptions) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setAlert(options);
    });
  }, []);

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

  const api = useMemo<AlertApi>(() => ({ showAlert, showToast }), [showAlert, showToast]);

  const meta = alert ? TYPE_META[alert.type] : null;
  const isConfirm = alert?.type === 'confirm' || alert?.type === 'danger-confirm';
  const isBlocking = alert?.type === 'loading' || alert?.type === 'danger-confirm';

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

      <div className="toast-stack" role="status" aria-live="polite">
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
