'use client';

/**
 * فاز ۹٫۵ — زنگوله‌ی جداگانه‌ی «ثبت عملیات سفارش».
 *
 * ⚠️ فقط سفارش‌های دارای عملیات دیده‌نشده در منو هستند و زیرمنو فقط همان
 *    ردیفها را نشان می‌دهد (§9.5.4).
 * ⚠️ باز کردن منو هیچ ردیفی را دیده‌شده نمی‌کند؛ فقط کلیک روی یک عملیات
 *    یا دکمه‌ی صریح «همه دیده شد» وضعیت را عوض می‌کند.
 * ⚠️ آیکن `activityBell` عمداً با `bell` اعلان فاز ۹ متفاوت است.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { formatBadge, truncate } from '@/lib/chat/core.mjs';
import {
  operationsHref,
  safeActivityHref,
  visibleUnseenGroups,
} from '@/lib/activities/core.mjs';
import { useActivities } from './ActivityProvider';

export function ActivityBell() {
  const {
    signedIn,
    role,
    groups,
    unseenTotal,
    loading,
    error,
    refresh,
    markSeen,
    markAllSeen,
  } = useActivities();
  const [open, setOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  /**
   * فاز ۱۲٫۱۰-هـ: منو در لایه‌ی بالا (popover) و دقیقاً زیر آیکن باز می‌شود
   * تا زیر محتوای دراور/صفحه نیفتد و بریده نشود.
   */
  useEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger || !open) return;
    const el = panel as HTMLElement & {
      showPopover?: () => void;
      matches?: (s: string) => boolean;
    };
    if (typeof el.showPopover === 'function' && !el.matches?.(':popover-open')) {
      el.showPopover();
    }
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(560, window.innerWidth - 16);
    const rightOffset = Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - width - 8));
    panel.style.setProperty('--bell-right', `${rightOffset}px`);
    panel.style.setProperty('--bell-top', `${Math.min(rect.bottom + 8, window.innerHeight - 120)}px`);
    panel.style.setProperty('--bell-width', `${width}px`);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setActiveProject(null);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveProject(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  if (!signedIn) return null;

  const visible = visibleUnseenGroups(groups);
  const active = visible.find((group) => group.projectId === activeProject) ?? null;
  const hasDot = unseenTotal > 0;

  return (
    <div className="act-bell" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="act-bell__trigger"
        aria-label={`ثبت عملیات سفارش${hasDot ? `، ${unseenTotal} دیده‌نشده` : ''}`}
        aria-expanded={open}
        title="ثبت عملیات سفارش"
        onClick={() => {
          setOpen((value) => !value);
          setActiveProject(null);
          // ⚠️ فقط بارگذاری داده؛ هیچ ردیفی دیده‌شده نمی‌شود.
          void refresh(false).catch(() => undefined);
        }}
      >
        <Icon name="activityBell" size={21} />
        {hasDot ? <span className="act-bell__dot" aria-hidden="true" /> : null}
      </button>

      {open ? (
        <section
          ref={panelRef}
          className="act-bell__panel"
          popover="manual"
          role="dialog" aria-label="عملیات‌های دیده‌نشده">
          <header className="act-bell__header">
            <strong>ثبت عملیات سفارش</strong>
            <button
              type="button"
              className="chat-link-btn"
              onClick={() => void markAllSeen().catch(() => undefined)}
              disabled={unseenTotal === 0}
            >
              <Icon name="checkDouble" size={14} />
              همه دیده شد
            </button>
          </header>

          <div className="act-bell__columns">
            <div className="act-bell__projects">
              {loading && visible.length === 0 ? (
                <div className="chat-skeleton" aria-hidden="true"><span /><span /></div>
              ) : null}
              {!loading && visible.length === 0 ? (
                <div className="chat-empty">
                  <span className="chat-empty__icon"><Icon name="inbox" size={24} /></span>
                  <p className="chat-empty__title">عملیات دیده‌نشدهای نیست</p>
                  <p className="chat-empty__text">رویدادهای تازه‌ی سفارش‌ها اینجا نمایش داده می‌شوند.</p>
                </div>
              ) : null}
              {visible.map((group) => (
                <button
                  key={group.projectId}
                  type="button"
                  className={`act-bell__project ${
                    group.projectId === activeProject ? 'act-bell__project--active' : ''
                  }`}
                  onClick={() => setActiveProject(group.projectId)}
                >
                  <span className="act-bell__project-body">
                    <strong>{group.code ?? 'سفارش'}</strong>
                    <span>{truncate(group.name ?? 'بدون عنوان', 42)}</span>
                  </span>
                  <span className="act-bell__count">{formatBadge(group.unseenCount)}</span>
                  <Icon name="chevronLeft" size={14} />
                </button>
              ))}
              {error ? <div className="chat-error" role="alert">{error}</div> : null}
            </div>

            {active ? (
              <div className="act-bell__submenu">
                <div className="act-bell__submenu-head">
                  <strong>{active.code ?? 'سفارش'}</strong>
                  <Link
                    href={safeActivityHref(operationsHref(role, active.projectId))}
                    className="chat-link-btn"
                    onClick={() => {
                      void markSeen(
                        active.items.map((item) => item.id),
                        active.projectId,
                      ).catch(() => undefined);
                      setOpen(false);
                      setActiveProject(null);
                    }}
                  >
                    باز کردن صفحه
                  </Link>
                </div>
                {active.items.map((item) => (
                  <Link
                    key={item.id}
                    href={safeActivityHref(operationsHref(role, active.projectId))}
                    className="act-bell__item"
                    onClick={() => {
                      // یک ردیف، فقط برای همین بیننده دیده‌شده می‌شود.
                      void markSeen([item.id], active.projectId).catch(() => undefined);
                      setOpen(false);
                      setActiveProject(null);
                    }}
                  >
                    <span className="act-bell__item-dot" aria-hidden="true" />
                    <span className="act-bell__item-body">
                      <strong>{truncate(item.title, 60)}</strong>
                      <span>{truncate(item.body ?? '', 90)}</span>
                      <RelativeTime value={item.createdAt} className="act-bell__item-time" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
