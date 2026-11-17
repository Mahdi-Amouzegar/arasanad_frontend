import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

/**
 * فاز ۱۲٫۵-ح — `/panel/profile`OTHER پوسته‌ی واقعی ندارد؛ تنظیمات حساب در
 * `/profile/` است. این صفحه یک لینک واقعی است، نه `PanelPlaceholder`.
 */
export function CustomerProfileAlias() {
  return (
    <Card>
      <CardHeader title="پروفایل من" actions={<Icon name="user" size={20} />} />
      <CardBody>
        <p className="prj-note">
          تنظیمات حساب، نام کاربری، دستگاه‌ها و اطلاع‌رسانی تلگرام در صفحه پروفایل قرار دارند.
        </p>
        <div className="prj-action-cell">
          <Link href="/profile/" className="btn btn--primary btn--sm">
            باز کردن پروفایل
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
