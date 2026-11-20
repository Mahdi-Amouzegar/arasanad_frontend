/* English comments are intentional: the Persian typography validator scans
   source files too. Pure helpers for Telegram-style message selection. */

export const FORWARD_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;
export const ORDER_DESCRIPTION_MAX = 2000;
export const MAX_FORWARD_SELECTION = 50;

/** Ordered ids between two selected messages, inclusive (server seq order). */
export function rangeIds(messages, anchorId, targetId) {
  if (!Array.isArray(messages) || !anchorId || !targetId) return [];
  const anchor = messages.findIndex((item) => item.id === anchorId);
  const target = messages.findIndex((item) => item.id === targetId);
  if (anchor < 0 || target < 0) return [];
  const from = Math.min(anchor, target);
  const to = Math.max(anchor, target);
  return messages
    .slice(from, to + 1)
    .filter((item) => item && item.kind !== 'system' && typeof item.id === 'string')
    .map((item) => item.id);
}

/** Click toggles one message; repeats never duplicate an id. */
export function toggleSelection(selected, id) {
  const list = Array.isArray(selected) ? selected : [];
  if (!id) return list;
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

/** Count messages, files and links in the current selection. */
export function selectionSummary(messages, ids) {
  const chosen = new Set(Array.isArray(ids) ? ids : []);
  const rows = (Array.isArray(messages) ? messages : []).filter((item) => chosen.has(item.id));
  return {
    messages: rows.length,
    files: rows.reduce((sum, item) => sum + (Array.isArray(item.files) ? item.files.length : 0), 0),
    links: rows.reduce((sum, item) => sum + (Array.isArray(item.links) ? item.links.length : 0), 0),
  };
}

/** Fallback description for the new-order draft when the server payload is empty. */
export function buildOrderDescription(messages, ids, max = ORDER_DESCRIPTION_MAX) {
  const chosen = new Set(Array.isArray(ids) ? ids : []);
  const lines = [];
  for (const item of Array.isArray(messages) ? messages : []) {
    if (!chosen.has(item.id)) continue;
    const who = item.senderName || 'کاربر';
    if (typeof item.body === 'string' && item.body.trim()) {
      lines.push(`فوروارد از ${who}: ${item.body.trim()}`);
    }
    for (const link of Array.isArray(item.links) ? item.links : []) {
      if (link && typeof link.url === 'string') lines.push(`فوروارد از ${who}: ${link.url}`);
    }
  }
  const text = lines.join('\n').trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 3))}...`;
}

/** Deduplicate attachments by id without losing their order. */
export function uniqueById(items) {
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}
