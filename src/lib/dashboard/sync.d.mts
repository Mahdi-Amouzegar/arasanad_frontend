/** Type declarations for the Phase 12.20 dashboard sync core. */

export declare const CUSTOMER_DASHBOARD_SECTIONS: string[];
export declare const ADMIN_DASHBOARD_SECTIONS: string[];

export declare function dashboardDataVersion(event: unknown): number;
export declare function dashboardSectionsForEvent(event: unknown, role?: string): string[];
export declare function isStaleDashboardSnapshot(snapshotVersion: unknown, latestVersion: unknown): boolean;
export declare function mergeDashboardSection(view: unknown, section: string, data: unknown): unknown;
