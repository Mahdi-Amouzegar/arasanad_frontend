'use client';

import { useRef, useState } from 'react';
import { PORTFOLIO_CATEGORIES, PORTFOLIO_ITEMS } from '@/content/catalog';
import { asset } from '@/lib/config';

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

  const items =
    category === 'همه'
      ? PORTFOLIO_ITEMS
      : PORTFOLIO_ITEMS.filter((item) => item.category === category);

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

  return (
    <>
      <div className="chip-row" role="group" aria-label="دسته‌بندی نمونه‌کارها">
        {PORTFOLIO_CATEGORIES.map((item) => (
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
              src={asset(`/images/portfolio/${item.file}`)}
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
                src={asset(`/images/portfolio/${current.file}`)}
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
