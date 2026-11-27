/**
 * فاز ۱۲٫۳۴ — کلاینت عمومی نرخ‌نامه و برآورد سرورمحور.
 *
 * ⚠️ محاسبه فقط روی سرور انجام می‌شود: رابط کاربری هیچ عددی را خودش
 *    ضرب یا گرد نمی‌کند و نتیجه‌ی `POST /pricing/quote` را نشان می‌دهد.
 */

import { apiRequest } from '@/lib/api';
import type { PricingQuoteInput, PricingQuoteResult, PublicPricingCatalog } from './types';

export type { PricingQuoteInput, PricingQuoteResult, PublicPricingCatalog } from './types';

export function getPricingCatalog(signal?: AbortSignal): Promise<PublicPricingCatalog> {
  return apiRequest<PublicPricingCatalog>('/pricing/catalog', { signal });
}

export function getPricingQuote(
  input: PricingQuoteInput,
  signal?: AbortSignal,
): Promise<PricingQuoteResult> {
  return apiRequest<PricingQuoteResult>('/pricing/quote', {
    method: 'POST',
    body: input,
    signal,
  });
}

/** نرخ معتبر یک ترکیب نوع × زبان؛ نرخ‌های زمان‌بندیشده در catalog نیستند. */
export function rateFor(
  catalog: PublicPricingCatalog | null,
  typeId: string,
  languageId: string,
): number | null {
  const rate = catalog?.rates?.[typeId]?.[languageId];
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : null;
}
