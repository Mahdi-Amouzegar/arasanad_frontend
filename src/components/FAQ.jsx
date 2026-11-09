import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';

const ITEMS = [
  {
    q: 'زمان تحویل معمولاً چقدر است؟',
    a: 'بسته به حجم و نوع سند متفاوت است؛ پس از ارسال فایل، زمان دقیق تحویل به شما اعلام می‌شود.',
  },
  {
    q: 'هزینه چگونه محاسبه می‌شود؟',
    a: 'هزینه بر اساس نوع خدمت، حجم و پیچیدگی سند برآورد و پیش از شروع کار به اطلاع شما می‌رسد.',
  },
  {
    q: 'آیا اطلاعات و محتوای سند من محرمانه می‌ماند؟',
    a: 'بله، محتوای هیچ سندی با شخص یا نهاد ثالثی به اشتراک گذاشته نمی‌شود.',
  },
  {
    q: 'چطور فایل خود را برای شما ارسال کنم؟',
    a: 'از طریق آیدی تلگرام یا آدرس معرفی‌شده در سایت typeiran.com می‌توانید فایل خود را ارسال کنید.',
  },
  {
    q: 'آیا امکان اصلاح رایگان بعد از تحویل وجود دارد؟',
    a: 'بله، اصلاح ایرادات تایپی و جزئی به‌صورت رایگان انجام می‌شود. اما اگر نیاز به افزودن مطلب جدید یا تغییر در طرح کلی متن باشد، این تغییرات به‌عنوان کار اضافه در نظر گرفته شده و بر اساس تعرفه محاسبه می‌شود.',
  },
  {
    q: 'اگر از کار راضی نباشم چه؟ (ضمانت بازگشت وجه)',
    a: 'کافی است نکاتی که مدنظرتان است را برای ما ارسال کنید تا طبق آن اصلاح صورت گیرد. در صورتی که پس از اصلاح هم کار تحویلی با خواسته شما تفاوت قابل‌توجهی داشته باشد، کل مبلغ پرداختی به شما بازگردانده می‌شود.',
  },
  {
    q: 'چطور می‌توانم وضعیت سفارشم را پیگیری کنم؟',
    a: 'برای پیگیری وضعیت سفارش، می‌توانید از طریق پیام در تلگرام یا پنل کاربری خود در سایت typeiran با ما در ارتباط باشید.',
  },
];

function AccordionItem({ item, isOpen, onToggle }) {
  const panelRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(0);

  useEffect(() => {
    setMaxHeight(isOpen && panelRef.current ? panelRef.current.scrollHeight : 0);
  }, [isOpen]);

  return (
    <div className="accordion-item">
      <button className="accordion-trigger" aria-expanded={isOpen} onClick={onToggle}>
        {item.q}
      </button>
      <div className="accordion-panel" ref={panelRef} style={{ maxHeight: `${maxHeight}px` }}>
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <Reveal as="section" className="faq" id="faq">
      <div className="faq-visual">
        <img src="/images/site/faq.avif" alt="سوالات متداول" loading="lazy" />
      </div>
      <h2>سوالات متداول</h2>
      <div className="accordion" id="accordion">
        {ITEMS.map((item, i) => (
          <AccordionItem
            key={item.q}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </Reveal>
  );
}
