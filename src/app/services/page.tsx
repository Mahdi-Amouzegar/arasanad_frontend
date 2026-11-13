import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { SERVICES, SERVICE_GROUPS, STEPS } from '@/content/site';

export const metadata: Metadata = {
  title: 'خدمات',
  description:
    'فهرست کامل خدمات تایپ، صفحهآرایی، فرمولنویسی، ویراستاری و آمادهسازی اسناد دانشگاهی و اداری در آراسند.',
  alternates: { canonical: '/services/' },
};

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="خدمات ما"
          title="دوازده خدمت، یک استاندارد تحویل"
          description="هر سند — از یک نامهی اداری کوتاه تا پایاننامهی چندصد صفحهای — با تعرفهی مشخص، زمانبندی روشن و محرمانگی کامل آماده میشود."
          actions={
            <Link href="/start/" className="btn btn--primary btn--sm">
              شروع سفارش
            </Link>
          }
        />

        <div className="service-detail-grid">
          {SERVICE_GROUPS.map((group) => (
            <div className="service-detail" key={group.title}>
              <div className="service-detail__head">
                <span className="service-detail__icon" aria-hidden="true">
                  <Icon name={group.icon} size={22} />
                </span>
                <div>
                  <h2 className="service-detail__title">{group.title}</h2>
                  <p className="service-detail__desc">{group.description}</p>
                </div>
              </div>
              <div className="service-detail__items">
                {group.items.map((title) => {
                  const service = SERVICES.find((item) => item.title === title);
                  if (!service) return null;
                  return (
                    <article className="service-detail__item" key={title}>
                      <span className="service-detail__item-icon" aria-hidden="true">
                        <Icon name={service.icon} size={17} />
                      </span>
                      <div>
                        <h3>{service.title}</h3>
                        <p>{service.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <SectionHeading
          eyebrow="پس از درخواست"
          title="روند کار چگونه است؟"
          description="همهی مراحل از پنل کاربری قابل پیگیری است."
        />
        <ol className="steps-timeline">
          {STEPS.map((step, index) => (
            <li className="steps-timeline__item" key={step.title}>
              <span className="steps-timeline__marker" aria-hidden="true">
                {['۱', '۲', '۳', '۴'][index]}
              </span>
              <div className="steps-timeline__card">
                <span className="steps-timeline__icon" aria-hidden="true">
                  <Icon name={step.icon} size={18} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section--tight">
        <div className="cta-band">
          <div>
            <h2>نرخ هر خدمت را ببینید</h2>
            <p>نرخ پایه بهازای هر صفحه، پیش از ثبت درخواست قابل مشاهده است.</p>
          </div>
          <div className="row">
            <Link href="/pricing/" className="btn btn--outline">
              نرخنامه
            </Link>
            <Link href="/start/" className="btn btn--primary">
              شروع سفارش
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
