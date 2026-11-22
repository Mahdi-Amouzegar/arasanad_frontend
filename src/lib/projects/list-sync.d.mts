/** Type declarations for the pure Phase 12.20 project-list sync core. */

export interface ProjectListResourceInput {
  scope?: string;
  view?: string;
  status?: string;
  q?: string;
  sort?: string;
  limit?: number;
  statuses?: string[];
  serviceTypes?: string[];
}

export declare function projectListResourceKey(input?: ProjectListResourceInput): string;
export declare function projectListEventVersion(event: unknown): number;
export declare function isStaleProjectListSnapshot(
  snapshotVersion: unknown,
  latestVersion: unknown,
): boolean;
