/**
 * Phase 12.20-F pure dashboard sync core.
 *
 * `event.seq` is only a replay cursor. Only numeric `dataVersion` is comparable.
 * Section names are a closed allowlist; unknown values are ignored.
 */

export const CUSTOMER_DASHBOARD_SECTIONS = ['cards', 'actions', 'recent', 'wallet', 'conversations'];
export const ADMIN_DASHBOARD_SECTIONS = ['cards'];

const PROJECT_SECTIONS = ['cards', 'actions', 'recent'];
const FINANCE_SECTIONS = ['cards', 'actions', 'wallet'];

export function dashboardDataVersion(event) {
  const value = Number(event?.payload?.dataVersion ?? event?.dataVersion);
  return Number.isFinite(value) ? value : 0;
}

/** Event type -> dirty sections. Admin currently exposes only cards. */
export function dashboardSectionsForEvent(event, role = 'customer') {
  const type = typeof event?.type === 'string' ? event.type : '';
  if (role === 'admin') {
    return ['project.created', 'project.status_changed', 'finance.updated', 'delivery.updated']
      .includes(type) ? ['cards'] : [];
  }
  if (['project.created', 'project.status_changed', 'delivery.updated'].includes(type)) {
    return [...PROJECT_SECTIONS];
  }
  if (type === 'finance.updated') return [...FINANCE_SECTIONS];
  if (type === 'chat.message.created' || type === 'chat.message.read') return ['cards', 'conversations'];
  return [];
}

export function isStaleDashboardSnapshot(snapshotVersion, latestVersion) {
  const snapshot = Number(snapshotVersion);
  const latest = Number(latestVersion);
  return Number.isFinite(snapshot) && Number.isFinite(latest) && latest > 0 && snapshot < latest;
}

/** Merge only the requested section; never invent missing fields. */
export function mergeDashboardSection(view, section, data) {
  if (!view || typeof view !== 'object') return view;
  if (section === 'cards' && Array.isArray(data)) return { ...view, cards: data };
  if (section === 'actions' && Array.isArray(data)) return { ...view, actions: data };
  if (section === 'recent' && Array.isArray(data)) return { ...view, recentProjects: data };
  if (section === 'conversations' && Array.isArray(data)) return { ...view, conversations: data };
  if (section === 'wallet' && data && typeof data === 'object') {
    return {
      ...view,
      wallet: {
        available: Number(data.wallet?.available ?? view.wallet?.available ?? 0),
        reserved: Number(data.wallet?.reserved ?? view.wallet?.reserved ?? 0),
      },
      pendingPayments: Number(data.pendingPayments ?? view.pendingPayments ?? 0),
    };
  }
  return view;
}
