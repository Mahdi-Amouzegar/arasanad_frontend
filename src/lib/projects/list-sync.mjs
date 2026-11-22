/**
 * Phase 12.20-E pure helpers for project-list synchronization.
 *
 * No React, no DOM, no fetch. Event `seq` is a replay cursor only;
 * only numeric `dataVersion` may be compared for staleness.
 */

/** Stable key for one configured list instance; filters and sort are part of the identity. */
export function projectListResourceKey(input = {}) {
  return JSON.stringify({
    scope: String(input.scope ?? 'customer'),
    view: String(input.view ?? 'orders'),
    status: String(input.status ?? ''),
    q: String(input.q ?? ''),
    sort: String(input.sort ?? 'new'),
    limit: Number(input.limit ?? 0),
    statuses: Array.isArray(input.statuses) ? [...input.statuses].sort() : [],
    serviceTypes: Array.isArray(input.serviceTypes) ? [...input.serviceTypes].sort() : [],
  });
}

/** Numeric epoch milliseconds from the realtime payload; invalid values become zero. */
export function projectListEventVersion(event) {
  const value = Number(event?.payload?.dataVersion ?? event?.dataVersion);
  return Number.isFinite(value) ? value : 0;
}

/** A snapshot older than an already-applied event must not overwrite the list. */
export function isStaleProjectListSnapshot(snapshotVersion, latestVersion) {
  const snapshot = Number(snapshotVersion);
  const latest = Number(latestVersion);
  return Number.isFinite(snapshot) && Number.isFinite(latest) && latest > 0 && snapshot < latest;
}
