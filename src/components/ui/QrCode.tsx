'use client';

import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export interface QrCodeProps {
  /** متنی که در QR رمزگذاری میشود (اینجا: لینک ورود همراه با #code=…) */
  value: string;
  size?: number;
  /** توضیح برای صفحهخوان؛ خود کد هرگز در aria گنجانده نمیشود */
  label: string;
  className?: string;
}

/**
 * رندر QR بهصورت SVG خالص، بدون Canvas، بدون CDN و بدون درخواست شبکه.
 *
 * ⚠️ `qrcode-generator` (MIT) بهصورت محلی باندل میشود و هیچ تصویر/فونت
 *    خارجی لازم ندارد. رنگها از توکنها میآیند تا در تم تاریک، ماژولهای
 *    تیره روی زمینهی تیره محو نشوند.
 * ⚠️ سطح تصحیح خطا `M` و حاشیهی ۲ ماژول (quiet zone) رعایت شده است.
 */
export function QrCode({ value, size = 208, label, className }: QrCodeProps) {
  const { modules, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();

    const count = qr.getModuleCount();
    const segments: string[] = [];
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) segments.push(`M${col} ${row}h1v1h-1z`);
      }
    }
    return { modules: count, path: segments.join('') };
  }, [value]);

  const margin = 2;
  const total = modules + margin * 2;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x="0" y="0" width={total} height={total} fill="var(--c-surface)" />
      <path d={path} fill="var(--c-text)" transform={`translate(${margin} ${margin})`} />
    </svg>
  );
}
