import Reveal from './Reveal';

const STEPS = [
  { num: '۱', title: 'انتخاب خدمت', desc: 'نوع سند و خدمت مورد نیاز خود را مشخص کنید.' },
  { num: '۲', title: 'ارسال فایل', desc: 'فایل خود را از طریق تلگرام یا آدرس معرفی‌شده ارسال کنید.' },
  { num: '۳', title: 'دریافت برآورد', desc: 'قیمت و زمان تحویل را دریافت و تایید کنید.' },
  { num: '۴', title: 'دریافت فایل نهایی', desc: 'سند آماده‌شده را در زمان مقرر تحویل بگیرید.' },
];

export default function HowItWorks() {
  return (
    <Reveal as="section" className="how-it-works" id="how">
      <h2>نحوه سفارش</h2>
      <div className="steps">
        {STEPS.map((s) => (
          <div className="step" key={s.num}>
            <span className="step-num">{s.num}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
