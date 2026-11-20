'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PORTFOLIO_CATEGORIES, PORTFOLIO_ITEMS } from '@/content/catalog';
import { asset } from '@/lib/config';
import { API_BASE } from '@/lib/api';
import { registerBackDismiss } from '@/lib/android-back';

interface PublicPortfolioItem {
  id: string;
  title: string;
  category: string;
  imageSrc: string | null;
  imageKind: 'parspack' | 'static' | 'none';
}

function sourceOf(item: PublicPortfolioItem): string {
  if (!item.imageSrc) return '';
  if (item.imageKind === 'static') return asset(item.imageSrc);
  if (item.imageKind === 'parspack') return `${API_BASE}${item.imageSrc}`;
  return '';
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * گالری نمونه‌کارها با نمایشگر تمام‌صفحه.
 *
 * ⚠️ رفتار زوم از نسخه‌ی قبلی سایت حفظ شده: زوم با دکمه، چرخ ماوس و کلیک
 *    روی تصویر؛ جابه‌جایی با کشیدن؛ بستن با Esc، پس‌زمینه و دکمه.
 */
export function PortfolioGallery() {
  const [category, setCategory] = useState<string>(PORTFOLIO_CATEGORIES[0] ?? 'همه');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const zoomRef = useRef(1);
  const baseRef = useRef({ w: 0, h: 0 });
  const draggingRef = useRef(false);
  const draggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  // فاز ۱۲: فهرست منتشرشده از بکند می‌آید؛ تا زمان بارگذاری یا در صورت خطا،
  // همان شش نمونه‌ی استاتیک قبلی نمایش داده می‌شوند (بدون صفحه خالی).
  const [remote, setRemote] = useState<PublicPortfolioItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/portfolio`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!alive || !payload?.ok || !Array.isArray(payload.data?.items)) return;
        const mapped = payload.data.items
          .filter((item: PublicPortfolioItem) => Boolean(sourceOf(item)))
          .map((item: PublicPortfolioItem) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            imageSrc: item.imageSrc,
            imageKind: item.imageKind,
          }));
        if (mapped.length > 0) setRemote(mapped);
      })
      .catch(() => { /* fallback استاتیک باقی می‌ماند */ });
    return () => { alive = false; };
  }, []);

  const allItems = useMemo(() => {
    if (remote) return remote;
    return PORTFOLIO_ITEMS.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      imageSrc: `/images/portfolio/${item.file}`,
      imageKind: 'static' as const,
    }));
  }, [remote]);

  const categories = useMemo(
    () => Array.from(new Set([...PORTFOLIO_CATEGORIES, ...allItems.map((item) => item.category)])),
    [allItems],
  );

  const items =
    category === 'همه'
      ? allItems
      : allItems.filter((item) => item.category === category);

  const current = openIndex === null ? null : (items[openIndex] ?? null);

  function applyZoom(next: number) {
    const img = imgRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;

    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));

    if (clamped > MIN_ZOOM && zoomRef.current === MIN_ZOOM) {
      const rect = img.getBoundingClientRect();
      baseRef.current = { w: rect.width, h: rect.height };
    }

    zoomRef.current = clamped;
    setZoom(clamped);

    if (clamped === MIN_ZOOM) {
      img.style.width = '';
      img.style.height = '';
      img.style.maxWidth = '';
      img.style.maxHeight = '';
      viewport.classList.remove('zoomed');
    } else {
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.width = `${Math.round(baseRef.current.w * clamped)}px`;
      img.style.height = `${Math.round(baseRef.current.h * clamped)}px`;
      viewport.classList.add('zoomed');

      requestAnimationFrame(() => {
        viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
        viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
      });
    }
  }

  function resetZoom() {
    applyZoom(MIN_ZOOM);
    viewportRef.current?.scrollTo(0, 0);
  }

  function open(index: number) {
    setOpenIndex(index);
    resetZoom();
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setOpenIndex(null);
    resetZoom();
  }

  // فاز ۱۲٫۱۳-ب: دکمه back اندروید فقط همین تصویر بزرگشده را می‌بندد.
  useEffect(() => {
    if (openIndex === null) return undefined;
    return registerBackDismiss(() => {
      dialogRef.current?.close();
      setOpenIndex(null);
      resetZoom();
      return true;
    });
    // resetZoom تنها به refها وابسته است و نیازی به تازهسازیEffect ندارد.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex]);

  return (
    <>
      <div className="chip-row" role="group" aria-label="دسته‌بندی نمونه‌کارها">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className="chip"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="portfolio-grid">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="portfolio-card"
            onClick={() => open(index)}
            aria-label={`مشاهده‌ی کامل ${item.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sourceOf(item)}
              alt={item.title}
              loading="lazy"
              width={640}
              height={480}
            />
            <span className="portfolio-card__meta">
              <span className="portfolio-card__title">{item.title}</span>
              <span className="portfolio-card__cat">{item.category}</span>
            </span>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="lightbox"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        {current ? (
          <>
            <div className="lightbox__bar">
              <span className="lightbox__title">{current.title}</span>
              <button type="button" className="lightbox__close" onClick={close} aria-label="بستن">
                ×
              </button>
            </div>

            <div
              className="lightbox__viewport"
              ref={viewportRef}
              onWheel={(event) => {
                event.preventDefault();
                applyZoom(zoomRef.current + (event.deltaY < 0 ? 0.25 : -0.25));
              }}
              onPointerDown={(event) => {
                if (zoomRef.current <= MIN_ZOOM) return;
                const viewport = viewportRef.current;
                if (!viewport) return;
                draggingRef.current = true;
                draggedRef.current = false;
                dragStartRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  scrollX: viewport.scrollLeft,
                  scrollY: viewport.scrollTop,
                };
                viewport.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!draggingRef.current) return;
                const viewport = viewportRef.current;
                if (!viewport) return;
                const dx = event.clientX - dragStartRef.current.x;
                const dy = event.clientY - dragStartRef.current.y;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) draggedRef.current = true;
                viewport.scrollLeft = dragStartRef.current.scrollX - dx;
                viewport.scrollTop = dragStartRef.current.scrollY - dy;
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={sourceOf(current)}
                alt={current.title}
                className="lightbox__img"
                draggable={false}
                onClick={() => {
                  if (draggedRef.current) {
                    draggedRef.current = false;
                    return;
                  }
                  applyZoom(zoomRef.current === 1 ? 2 : 1);
                }}
              />
            </div>

            <div className="lightbox__toolbar">
              <button type="button" onClick={() => applyZoom(zoomRef.current - 0.5)} aria-label="کوچک‌نمایی">
                −
              </button>
              <button type="button" onClick={resetZoom} aria-label="بازنشانی زوم">
                {zoom.toLocaleString('fa-IR')}٪
              </button>
              <button type="button" onClick={() => applyZoom(zoomRef.current + 0.5)} aria-label="بزرگ‌نمایی">
                +
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
