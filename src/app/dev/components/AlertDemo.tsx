'use client';

import { Button } from '@/components/ui/Button';
import { useAlert } from '@/components/ui/AlertProvider';

/** نمونه‌ی تعاملی سیستم هشدار — فقط برای صفحه‌ی پیش‌نمایش. */
export function AlertDemo() {
  const { showAlert, showToast } = useAlert();

  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <Button
        variant="outline"
        onClick={() =>
          showAlert({
            type: 'success',
            title: 'سفارش با موفقیت ثبت شد',
            message: 'کد پروژه‌ی شما ARS-1043 است و در «سفارش‌های من» قابل مشاهده است.',
          })
        }
      >
        موفقیت
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          showAlert({
            type: 'error',
            title: 'ارسال رسید ناموفق بود',
            message: 'حجم فایل بیشتر از حد مجاز است. فایل کوچک‌تری انتخاب کنید.',
          })
        }
      >
        خطا
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          showAlert({
            type: 'warning',
            title: 'نرخ کمتر از حد پایه است',
            message: 'نرخ هر صفحه نمی‌تواند کمتر از نرخ پایه‌ی این خدمت باشد.',
          })
        }
      >
        هشدار
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          showAlert({
            type: 'confirm',
            title: 'پذیرش نرخ',
            message: 'با نرخ هر صفحه ۴۵٬۰۰۰ تومان و بیعانه‌ی ۶۷۵٬۰۰۰ تومان موافق هستید؟',
            confirmText: 'تأیید و پرداخت',
            cancelText: 'انصراف',
          })
        }
      >
        تأیید دو‌گزینه‌ای
      </Button>

      <Button
        variant="danger"
        onClick={() =>
          showAlert({
            type: 'danger-confirm',
            title: 'لغو سفارش',
            message: 'سفارش لغو شود؟ این کار قابل بازگشت نیست و بیعانه طبق سیاست بازگشت می‌شود.',
            confirmText: 'لغو سفارش',
            cancelText: 'بازگشت',
          })
        }
      >
        تأیید خطرناک
      </Button>

      <Button variant="secondary" onClick={() => showToast({ title: 'رسید ارسال شد' })}>
        Toast موفق
      </Button>

      <Button
        variant="secondary"
        onClick={() =>
          showToast({
            type: 'error',
            title: 'اتصال قطع شد',
            message: 'تغییرات ذخیره نشد؛ دوباره تلاش کنید.',
          })
        }
      >
        Toast خطا
      </Button>
    </div>
  );
}
