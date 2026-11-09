/** ترکیب کلاس‌ها با حذف مقدارهای خالی. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
