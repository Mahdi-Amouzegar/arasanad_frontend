import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FormField, Input, Select, TextField, Textarea } from '@/components/ui/Field';

export const metadata: Metadata = {
  title: 'پیش‌نمایش اجزا',
  robots: { index: false, follow: false },
};

const COLORS = [
  ['primary', 'var(--c-primary)'],
  ['primary-hover', 'var(--c-primary-hover)'],
  ['primary-light', 'var(--c-primary-light)'],
  ['bg', 'var(--c-bg)'],
  ['surface', 'var(--c-surface)'],
  ['border', 'var(--c-border)'],
  ['text', 'var(--c-text)'],
  ['text-secondary', 'var(--c-text-secondary)'],
  ['success', 'var(--c-success)'],
  ['warning', 'var(--c-warning)'],
  ['danger', 'var(--c-danger)'],
  ['info', 'var(--c-info)'],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      <h2 style={{ fontSize: 'var(--fs-section)' }}>{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsPreviewPage() {
  return (
    <main
      className="container"
      style={{ paddingBlock: 'var(--sp-8)', display: 'grid', gap: 'var(--sp-10)' }}
    >
      <PageHeader
        title="پیش‌نمایش اجزای آراسند"
        description="مرجع بصری Design System. این صفحه در فاز ۳ برای تأیید ظاهر ساخته شده و در فاز ۱۳ از خروجی حذف می‌شود."
        actions={
          <>
            <Button variant="outline" size="sm">
              دکمه‌ی فرعی
            </Button>
            <Button size="sm">دکمه‌ی اصلی</Button>
          </>
        }
      />

      <Section title="پالت رنگ">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 'var(--sp-3)',
          }}
        >
          {COLORS.map(([name, value]) => (
            <div key={name} style={{ display: 'grid', gap: 6 }}>
              <div
                style={{
                  height: 56,
                  borderRadius: 'var(--r-md)',
                  background: value,
                  border: '1px solid var(--c-border)',
                }}
              />
              <code style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-secondary)' }}>
                {name}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="تایپوگرافی">
        <Card>
          <CardBody>
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              <p style={{ fontSize: 'var(--fs-page-title)', fontWeight: 700 }}>
                عنوان صفحه — آراستن اسناد با دقت
              </p>
              <p style={{ fontSize: 'var(--fs-section)', fontWeight: 600 }}>عنوان بخش</p>
              <p style={{ fontSize: 'var(--fs-card-title)', fontWeight: 600 }}>عنوان کارت</p>
              <p>
                متن اصلی: تایپ تخصصی متون فارسی و انگلیسی با رعایت اصول نگارشی. اعداد
                <span className="tabular"> ۱۲۳۴۵۶۷۸۹۰ </span>
                باید خوانا باشند.
              </p>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
                متن ثانویه — برای توضیحات کم‌اهمیت.
              </p>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
                توضیح کوچک ۱۲ پیکسل.
              </p>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="دکمه‌ها">
        <Card>
          <CardBody>
            <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button>اصلی</Button>
                <Button variant="secondary">ثانویه</Button>
                <Button variant="outline">دور‌خط</Button>
                <Button variant="ghost">شبح</Button>
                <Button variant="danger">حذف</Button>
              </div>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button size="sm">کوچک</Button>
                <Button size="lg">بزرگ</Button>
                <Button loading>در حال ارسال</Button>
                <Button disabled>غیرفعال</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="نشان وضعیت">
        <Card>
          <CardBody>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Badge tone="neutral" dot>
                پیش‌نویس
              </Badge>
              <Badge tone="warning" dot>
                در انتظار پرداخت
              </Badge>
              <Badge tone="primary" dot>
                در حال انجام
              </Badge>
              <Badge tone="success" dot>
                تحویل‌شده
              </Badge>
              <Badge tone="danger" dot>
                لغوشده
              </Badge>
              <Badge tone="info">اطلاع</Badge>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="کارت آماری">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--sp-4)',
          }}
        >
          <StatCard label="پروژه‌های فعال" value="۴" hint="۲ مورد نیازمند اقدام" />
          <StatCard label="در انتظار پرداخت" value="۲" hint="بیعانه تأیید نشده" />
          <StatCard label="موجودی کیف پول" value="۱٬۲۵۰٬۰۰۰" hint="تومان" />
        </div>
      </Section>

      <Section title="فرم‌ها">
        <Card>
          <CardBody>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--sp-4)',
              }}
            >
              <TextField label="نام پروژه" placeholder="مثال: پایان‌نامه کارشناسی ارشد" required />
              <TextField
                label="تعداد صفحه"
                type="number"
                defaultValue={10}
                hint="تعداد صفحات ورودی"
              />
              <FormField label="نوع خدمت" htmlFor="svc" required>
                <Select id="svc" defaultValue="fa">
                  <option value="fa">فارسی</option>
                  <option value="en">انگلیسی</option>
                  <option value="math">ریاضی</option>
                </Select>
              </FormField>
              <TextField
                label="شماره تماس"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                error="شماره وارد‌شده معتبر نیست"
                invalid
              />
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}>
              <FormField label="توضیحات" htmlFor="desc" hint="هر نکته‌ای که باید بدانیم">
                <Textarea id="desc" placeholder="توضیحات سفارش…" />
              </FormField>
            </div>
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <FormField label="شهر" htmlFor="disabled-field">
                <Input id="disabled-field" value="تهران" disabled readOnly />
              </FormField>
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section title="حالت خالی و بارگذاری">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--sp-4)',
          }}
        >
          <Card>
            <EmptyState
              title="هنوز پروژه‌ای ثبت نکرده‌اید"
              description="برای شروع، اولین سفارش خود را ثبت کنید."
              icon={<span style={{ fontSize: 22 }}>＋</span>}
              action={<Button size="sm">ثبت سفارش جدید</Button>}
            />
          </Card>
          <Card>
            <CardHeader title="در حال بارگذاری" />
            <CardBody>
              <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
                <Skeleton height={20} width="55%" />
                <Skeleton height={14} />
                <Skeleton height={14} width="80%" />
                <Skeleton height={14} width="65%" />
              </div>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="جدول و تب">
        <Card>
          <div style={{ padding: '0 var(--sp-5)' }}>
            <div className="tabs" role="tablist">
              <button className="tab" role="tab" aria-selected="true">
                همه
              </button>
              <button className="tab" role="tab" aria-selected="false">
                در حال انجام
              </button>
              <button className="tab" role="tab" aria-selected="false">
                منتظر پرداخت
              </button>
              <button className="tab" role="tab" aria-selected="false">
                تکمیل‌شده
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>کد پروژه</th>
                  <th>نام پروژه</th>
                  <th>وضعیت</th>
                  <th>مانده</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="table__num ltr">ARS-1042</td>
                  <td>پایان‌نامه ارشد</td>
                  <td>
                    <Badge tone="primary" dot>
                      در حال انجام
                    </Badge>
                  </td>
                  <td className="table__num">۳۰۰٬۰۰۰</td>
                </tr>
                <tr>
                  <td className="table__num ltr">ARS-1041</td>
                  <td>مقاله ISI</td>
                  <td>
                    <Badge tone="warning" dot>
                      در انتظار بیعانه
                    </Badge>
                  </td>
                  <td className="table__num">۱۲۰٬۰۰۰</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </main>
  );
}
