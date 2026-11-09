import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const Lightbox = forwardRef(function Lightbox(_, ref) {
  const dialogRef = useRef(null);
  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [zoomPercent, setZoomPercent] = useState(100);

  const zoomScaleRef = useRef(1);
  const baseSizeRef = useRef({ w: 0, h: 0 });
  const draggingRef = useRef(false);
  const wasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  function setZoom(scale) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    const img = imgRef.current;
    const viewport = viewportRef.current;
    if (!img || !viewport) return;

    // اگر برای اولین‌بار از حالت عادی می‌خواهیم زوم کنیم، اندازه‌ی فعلی تصویر را به‌عنوان مبنا ذخیره می‌کنیم
    if (clamped > MIN_ZOOM && zoomScaleRef.current === MIN_ZOOM) {
      const rect = img.getBoundingClientRect();
      baseSizeRef.current = { w: rect.width, h: rect.height };
    }

    zoomScaleRef.current = clamped;

    if (clamped === MIN_ZOOM) {
      img.style.width = '';
      img.style.height = '';
      img.style.maxWidth = '';
      img.style.maxHeight = '';
    } else {
      // بزرگ‌نمایی واقعی (نه transform) تا مرورگر محدوده‌ی اسکرول را درست محاسبه کند
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.width = `${Math.round(baseSizeRef.current.w * clamped)}px`;
      img.style.height = `${Math.round(baseSizeRef.current.h * clamped)}px`;
    }

    viewport.classList.toggle('zoomed', clamped > MIN_ZOOM);
    setZoomPercent(Math.round(clamped * 100));

    if (clamped > MIN_ZOOM) {
      requestAnimationFrame(() => {
        viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
        viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
      });
    }
  }

  function resetZoom() {
    setZoom(1);
    viewportRef.current?.scrollTo(0, 0);
  }

  useImperativeHandle(ref, () => ({
    open(imgSrc, imgAlt) {
      setSrc(imgSrc);
      setAlt(imgAlt || 'نمایش کامل نمونه‌کار');
      resetZoom();
      dialogRef.current?.showModal();
    },
  }));

  // رویداد بومی close دیالوگ (وقتی با Esc هم بسته شود) - زوم را بازنشانی می‌کند
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const handler = () => resetZoom();
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(e) {
    if (e.target === dialogRef.current) handleClose();
  }

  function handleImgClick() {
    if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
    setZoom(zoomScaleRef.current === 1 ? 2 : 1);
  }

  function handleWheel(e) {
    e.preventDefault();
    setZoom(zoomScaleRef.current + (e.deltaY < 0 ? 0.25 : -0.25));
  }

  function handlePointerDown(e) {
    if (zoomScaleRef.current <= MIN_ZOOM) return;
    e.preventDefault();
    draggingRef.current = true;
    wasDraggedRef.current = false;
    viewportRef.current?.classList.add('dragging');
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollX: viewportRef.current.scrollLeft,
      scrollY: viewportRef.current.scrollTop,
    };
    viewportRef.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDraggedRef.current = true;
    viewportRef.current.scrollLeft = dragStartRef.current.scrollX - dx;
    viewportRef.current.scrollTop = dragStartRef.current.scrollY - dy;
  }

  function handlePointerUp() {
    draggingRef.current = false;
    viewportRef.current?.classList.remove('dragging');
  }

  return (
    <dialog id="lightbox" className="lightbox" ref={dialogRef} onClick={handleBackdropClick}>
      <button className="lightbox-close" onClick={handleClose} aria-label="بستن">×</button>
      <div
        className="lightbox-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img ref={imgRef} src={src} alt={alt} draggable="false" onClick={handleImgClick} />
      </div>
      <div className="lightbox-toolbar">
        <button onClick={() => setZoom(zoomScaleRef.current - 0.5)} aria-label="کوچک‌نمایی">−</button>
        <button onClick={resetZoom} aria-label="بازنشانی زوم">{zoomPercent.toLocaleString('fa-IR')}٪</button>
        <button onClick={() => setZoom(zoomScaleRef.current + 0.5)} aria-label="بزرگ‌نمایی">+</button>
      </div>
    </dialog>
  );
});

export default Lightbox;
