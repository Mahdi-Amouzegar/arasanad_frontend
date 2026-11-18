/**
 * یکسانسازی آدرس لینک خارجی قبل از ذخیره.
 *
 * کاربران گاه‌ی تنها `https` یا `https://www.` می‌نویسند؛ ما تکمیلش می‌کنیم
 * و سپس اعتبارسنجی امنیتی سرور (`validateExternalUrl`) همانند قبل اعمال می‌شود.
 */

export function normalizeExternalUrl(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  let value: string;
  const withScheme = /^(https?):\s*\/*\s*(.*)$/i.exec(input);
  if (withScheme) {
    // «https»، «https:»، «https:/»، «https://www...» و «https example.com»
    value = `${withScheme[1]}://${(withScheme[2] ?? '').replace(/^\/+/, '')}`;
  } else {
    value = `https://${input.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
