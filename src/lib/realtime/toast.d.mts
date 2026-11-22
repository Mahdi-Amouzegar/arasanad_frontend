/** Type declarations for the pure business-toast mapper (`toast.mjs`). */

export interface BusinessToast {
  type: 'success' | 'info';
  title: string;
  message: string;
}

export declare function eventDataVersion(event: unknown): number;
export declare function businessToastFor(
  event: unknown,
  statusLabel?: (value: string) => string,
): BusinessToast | null;
