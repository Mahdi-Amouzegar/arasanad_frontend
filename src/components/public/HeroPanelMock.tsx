import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

/**
 * ماکت پنل سفارشها — جایگزین عکس استاک هیرو.
 *
 * ⚠️ ایده از تصاویر `refs/` (داشبورد واقعی مشتری/مدیر) گرفته شده، ولی
 *    بهجای کپی کردن عکس، با همان اجزای طراحی سایت (نشان وضعیت، ردیف،
 *    توکنها) ساخته شده است: رایگان، همخوان با RTL، و نمایشدهندهی محصول واقعی.
 * ⚠️ دادهها فقط نمایشیاند و هیچ ادعای آماری ندارند؛ آمار واقعی در `STATS`
 *    و نشان هیرو جداگانه و بدون تکرار نگهداری میشود.
 */

const ORDERS = [
  { title: 'قالببندی پایاننامه', meta: '۱۲۸ صفحه · دانشگاه آزاد', tone: 'warning' as const, label: 'در انتظار تأیید نرخ' },
  { title: 'تبدیل PDF به Word', meta: '۲۴ صفحه · جدول و فرمول', tone: 'info' as const, label: 'در حال انجام' },
  { title: 'ویراستاری مقاله', meta: '۱۸ صفحه · ژورنال ISI', tone: 'success' as const, label: 'آماده‌ی تحویل' },
];

export function HeroPanelMock() {
  return (
    <div className="hero-mock" role="img" aria-label="پیشنمایش پنل سفارشهای آراسند">
      <div className="hero-mock__bar">
        <span className="hero-mock__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="hero-mock__bar-title">سفارشهای من</span>
        <Badge tone="primary" dot>
          ۳ فعال
        </Badge>
      </div>

      <div className="hero-mock__body">
        {ORDERS.map((order) => (
          <div className="hero-mock__row" key={order.title}>
            <span className="hero-mock__row-icon" aria-hidden="true">
              <Icon name="file" size={16} />
            </span>
            <div className="hero-mock__row-text">
              <strong>{order.title}</strong>
              <span>{order.meta}</span>
            </div>
            <Badge tone={order.tone}>{order.label}</Badge>
          </div>
        ))}
      </div>

      <div className="hero-mock__foot">
        <span className="hero-mock__foot-icon" aria-hidden="true">
          <Icon name="shield" size={15} />
        </span>
        <span>فایلها فقط از حساب خودتان قابل دسترسیاند</span>
      </div>
    </div>
  );
}
