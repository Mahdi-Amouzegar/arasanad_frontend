/**
 * فاز ۱۲٫۳۱ — منطق خالص تنظیمات اعلان در کلاینت.
 *
 * ⚠️ اینجا تنها تصمیم نمایش/عدم نمایش است؛ منبع فهرست رویداد‌ها بکند است.
 */

const REALTIME_TO_EVENT = {
  'project.created': 'project.created',
  'project.status_changed': 'project.status',
  'activity.created': 'activity.note',
  'finance.updated': 'payment.approved',
  'delivery.updated': 'delivery.created',
  'notification.created': 'message.created',
};

/** نوع کاتالوک متناظر با رویداد انتقال (برای Toast و نوتیف مرورگر). */
export function catalogEventTypeForRealtime(type) {
  return REALTIME_TO_EVENT[type] ?? type ?? '';
}

/** ترکیب تنظیم عمومی کانال و تنظیم تکرویداد. نبود تنظیم = فعال. */
export function eventChannelEnabled(settings, type, channel) {
  if (!settings) return true;
  if (settings.channels && settings.channels[channel] === false) return false;
  const event = settings.events && settings.events[type];
  return !event || event[channel] !== false;
}

/** وضعیت گروه: all / mixed / none — برای نمایش حالت ترکیبی. */
export function groupToggleState(items, channel, settings) {
  let enabled = 0;
  for (const item of items) {
    if (eventChannelEnabled(settings, item.type, channel)) enabled += 1;
  }
  if (items.length === 0 || enabled === 0) return 'none';
  return enabled === items.length ? 'all' : 'mixed';
}
