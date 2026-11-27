/** فاز ۱۲٫۳۴ — انواع مشترک قرارداد نرخ‌نامه. */

export interface PricingType {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PricingLanguage {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PricingVersion {
  id: string;
  versionNo: number;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  executedAt: string | null;
  createdAt: string;
  note: string | null;
}

export interface PricingMatrixRow {
  typeId: string;
  languageId: string;
  typeName: string;
  languageName: string;
  pricePerPage: number | null;
}

export interface PricingNextVersion {
  id: string;
  effectiveFrom: string;
  versionNo: number;
}

/** پاسخ `GET /pricing/catalog` — فقط نرخ‌های معتبر و فعال در rates هستند. */
export interface PublicPricingCatalog {
  types: PricingType[];
  languages: PricingLanguage[];
  rates: Record<string, Record<string, number>>;
  version: PricingVersion;
  nextVersion: PricingNextVersion | null;
  serverTime: string;
}

/** پاسخ `GET /admin/pricing/catalog`. */
export interface AdminPricingCatalog extends PublicPricingCatalog {
  versions: PricingVersion[];
}

export interface PricingQuoteInput {
  typeId: string;
  languageId: string;
  sourcePageCount: number;
  deliveryHours: number;
  urgent: boolean;
}

/** پاسخ `POST /pricing/quote` — تمام مبالغ از سرور می‌آیند. */
export interface PricingQuoteResult {
  estimateAmount: number;
  depositAmount: number;
  basePricePerPage: number;
  versionId: string;
  snapshot: unknown;
}

export interface PricingVersionChange {
  typeId: string;
  languageId: string;
  pricePerPage: number;
}

export interface CreatePricingVersionInput {
  changes: PricingVersionChange[];
  mode: 'immediate' | 'scheduled';
  effectiveFrom?: string;
  note?: string;
}
