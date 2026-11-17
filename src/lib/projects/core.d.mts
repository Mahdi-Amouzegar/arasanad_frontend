/** Type declarations for the pure projects core (`core.mjs`). */

export type ProjectStatus =
  | 'draft'
  | 'pending_review'
  | 'awaiting_deposit'
  | 'in_progress'
  | 'awaiting_final_quote'
  | 'awaiting_final_payment'
  | 'ready_for_delivery'
  | 'delivered'
  | 'revision_requested'
  | 'completed'
  | 'cancel_requested'
  | 'cancelled';

export interface DeliveryUnit {
  value: 'hour' | 'day' | 'week';
  label: string;
  hours: number;
}
export declare const DELIVERY_UNITS: readonly DeliveryUnit[];
export declare const DELIVERY_VALUE_MIN: number;
export declare const DELIVERY_VALUE_MAX: number;
export declare function deliveryHoursFrom(value: number | string, unit: string): number | null;
export declare function isAllowedDeliveryHours(hours: number | string): boolean;
export declare const LANGUAGES: readonly string[];
export declare const SOURCE_TYPES: readonly string[];
export declare const OUTPUT_FORMATS: readonly string[];
export declare const PROJECT_STATUSES: readonly ProjectStatus[];
export declare const STATUS_TRANSITIONS: Record<string, string[]>;

export declare function canTransition(from: string, to: string): boolean;
export declare function isUrgent(deliveryHours: number): boolean;

export declare const URGENCY_MULTIPLIER: number;
export declare const ROUND_STEP: number;
export declare const DEPOSIT_RATIO: number;

export interface EstimateInput {
  pricePerPage: number;
  pages: number;
  urgent?: boolean;
  /** Urgency multiplier from the server pricing rules. */
  multiplier?: number;
  /** Rounding step from the server pricing rules. */
  step?: number;
}

export declare function roundToNearest(value: number, step?: number): number;
export declare function calculateEstimate(input: EstimateInput): number;
export declare function calculateDeposit(total: number, ratio?: number, step?: number): number;
export declare function calculateRemaining(total: number, paid: number): number;

export interface DesignMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface DesignSpec {
  fontFa?: string;
  fontEn?: string;
  bodySize?: number;
  heading1Size?: number;
  lineSpacing?: number;
  paperSize?: string;
  margins?: DesignMargins;
  [key: string]: unknown;
}

export declare const DEFAULT_DESIGN_SPEC: DesignSpec;
export declare function mergeDesignSpec(
  preset: DesignSpec,
  overrides?: Partial<DesignSpec>,
): DesignSpec;
export declare function changedDesignFields(spec: DesignSpec, preset: DesignSpec): string[];

export interface ProjectDraftDesign {
  mode?: string;
  submode?: string;
  presetId?: string | null;
  spec?: DesignSpec;
}

export interface ProjectDraftInput {
  name?: string;
  serviceTypeId?: string;
  language?: string;
  sourceType?: string;
  sourcePageCount?: number;
  deliveryHours?: number;
  outputFormat?: string;
  description?: string;
  specialRequirements?: string;
  design?: ProjectDraftDesign;
  [key: string]: unknown;
}

export interface ValidationResult {
  ok: boolean;
  /** Field name (or dotted path) to a Persian error message. */
  errors: Record<string, string>;
}

export declare function validateProjectDraft(draft: ProjectDraftInput): ValidationResult;

export declare const publicProjectFields: readonly string[];
export declare function formatProjectCode(value: unknown): string;
