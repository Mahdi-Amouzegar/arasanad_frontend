import { useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../components/Reveal';
import FAQ from '../components/FAQ';

function roundToNearest(num, step) {
  return Math.round(num / step) * step;
}

export default function Pricing() {
  const [rows, setRows] = useState(null); // null = در حال بارگذاری
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [urgent, setUrgent] = useState(false);

  const calcRef = useRef(null);

  useEffect(() => {
    fetch('/data/prices.csv', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('network');
        return res.text();
      })
      .then((csvText) => {
        const lines = csvText.trim().split('\n');
        const parsed = lines
          .slice(1)
          .map((line) => {
            const [name, price, popular, desc] = line.split(',');
            if (!name || !price) return null;
            return {
              name: name.trim(),
              price: Number(price.trim()),
              popular: (popular || '').trim() === 'بله',
              desc: (desc || '').trim(),
            };
          })
          .filter(Boolean);
        setRows(parsed);
        if (parsed.length) setSelected(parsed[0].name);
      })
      .catch(() => setError(true));
  }, []);

  const selectedRow = useMemo(() => rows?.find((r) => r.name === selected), [rows, selected]);

  const estimate = useMemo(() => {
    if (!selectedRow) return 0;
    const count = Math.max(1, Number(pageCount) || 0);
    const raw = selectedRow.price * count * (urgent ? 1.3 : 1);
    return roundToNearest(raw, 500);
  }, [selectedRow, pageCount, urgent]);

  function chooseService(name) {
    setSelected(name);
    calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <Reveal as="section" className="page-intro">
        <span className="eyebrow">قیمت‌گذاری شفاف و منصفانه</span>
        <h1>تعرفه‌های خدمات تایپ و ویراستاری</h1>
        <p>
          در آراسند به شفافیت کامل در قیمت‌گذاری اعتقاد داریم. قیمت‌های زیر، قیمت پایه برای هر نوع کار
          هستند؛ قیمت نهایی بسته به پیچیدگی، حجم کار و کیفیت عکس یا دست‌خط ارسالی می‌تواند متفاوت باشد.
        </p>
      </Reveal>

      <Reveal as="section" className="pricing-cards-section">
        {error && <p className="price-loading">قیمت‌ها موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.</p>}
        {!error && rows === null && (
          <div className="pricing-cards-grid">
            {Array.from({ length: 4 }).map((_, i) => <div className="skeleton skeleton-service-card" key={i} />)}
          </div>
        )}
        {!error && rows && (
          <div className="pricing-cards-grid">
            {rows.map((r) => {
              const urgentPrice = roundToNearest(r.price * 1.3, 500);
              return (
                <div className={`service-price-card ${r.popular ? 'featured' : ''}`} key={r.name}>
                  {r.popular && <span className="featured-badge">پیشنهاد ویژه</span>}
                  <h3>{r.name}</h3>
                  <p className="service-price-desc">{r.desc}</p>
                  <div className="service-price-rows">
                    <div className="service-price-row">
                      <span>تحویل عادی (هر صفحه)</span>
                      <strong>{r.price.toLocaleString('en-US')} تومان</strong>
                    </div>
                    <div className="service-price-row">
                      <span>تحویل فوری (هر صفحه)</span>
                      <strong>{urgentPrice.toLocaleString('en-US')} تومان</strong>
                    </div>
                  </div>
                  <button className="service-price-btn" onClick={() => chooseService(r.name)}>
                    محاسبه قیمت این خدمت
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>

      <Reveal as="section" className="calculator-section" id="calculator">
        <div className="calculator-grid">
          <div className="calculator-visual">
            <img src="/images/site/calculator.avif" alt="محاسبه‌ی هزینه سفارش" loading="lazy" />
          </div>
          <div className="calculator-box" ref={calcRef}>
            <span className="eyebrow">ابزار برآورد هزینه</span>
            <h2>محاسبه‌گر آنلاین قیمت</h2>
            <p className="calc-note">هزینه حدودی سفارش خود را قبل از ثبت نهایی محاسبه کنید.</p>

            <div className="calc-grid">
              <div className="calc-field">
                <label htmlFor="calc-service">نوع خدمت</label>
                <select id="calc-service" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {rows?.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="calc-field">
                <label htmlFor="calc-count">تعداد صفحه / دقیقه</label>
                <input
                  id="calc-count"
                  type="number"
                  min="1"
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  placeholder="مثلاً: ۵۰"
                />
              </div>
            </div>

            <div className="calc-field">
              <label>زمان تحویل</label>
              <div className="calc-toggle">
                <button className={!urgent ? 'active' : ''} onClick={() => setUrgent(false)}>عادی</button>
                <button className={urgent ? 'active' : ''} onClick={() => setUrgent(true)}>فوری (٪۳۰+)</button>
              </div>
            </div>

            <div className="calc-result">
              <span>هزینه برآوردی شما:</span>
              <strong>{selectedRow ? `${estimate.toLocaleString('en-US')} تومان` : '---'}</strong>
            </div>
            <p className="calc-disclaimer">این مبلغ تقریبی است و پس از بررسی فایل نهایی شما تایید می‌شود.</p>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="format-section">
        <div className="format-grid">
          <div className="format-visual">
            <img src="/images/site/format.avif" alt="مشخصات استاندارد صفحه‌آرایی سند" loading="lazy" />
          </div>
          <div className="format-box">
            <h3>فرمت استاندارد تحویل کار</h3>
            <ul className="format-list">
              <li>اندازه صفحه: <strong>A4</strong> با حاشیه ۲٫۵ سانتی‌متر از هر طرف</li>
              <li>فونت فارسی: <strong>B Nazanin</strong> سایز ۱۶ — فاصله خطوط ۱٫۵ برابر</li>
              <li>فونت انگلیسی: <strong>Times New Roman</strong> سایز ۱۶</li>
              <li>متن با فونت <strong>HM XZar</strong> نیز همراه فایل ارسال می‌شود</li>
              <li>فرمت نهایی فایل: <strong>PDF</strong></li>
            </ul>
            <p className="format-note">در صورت درخواست فرمت خاص از سوی شما، کار مطابق همان فرمت درخواستی آماده و ارسال خواهد شد.</p>
          </div>
        </div>
      </Reveal>

      <FAQ />
    </>
  );
}
