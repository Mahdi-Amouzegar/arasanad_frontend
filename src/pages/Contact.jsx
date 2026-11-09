import Reveal from '../components/Reveal';

const CHANNELS = [
  {
    href: 'https://t.me/Mehdi_Amouz', label: 'تلگرام', value: '‎@Mehdi_Amouz', external: true,
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3 2 11l6 2 2 6 3-4 5 4z" /><path d="M10 13l9-8" /></svg>,
  },
  {
    href: 'https://ble.ir/mehdi_amouz', label: 'بله', value: '‎@mehdi_amouz', external: true,
    img: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bale.svg',
  },
  {
    href: 'tel:+989364272899', label: 'تلفن تماس', value: '۰۹۳۶۴۲۷۲۸۹۹',
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  },
  {
    href: 'mailto:mhdamouz@gmail.com', label: 'پست الکترونیک', value: 'mhdamouz@gmail.com',
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  },
];

export default function Contact() {
  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const phone = form.phone.value;
    const subject = form.subject.value || 'پیام از سایت آراسند';
    const message = form.message.value;
    const body = encodeURIComponent(`نام: ${name}\nشماره تماس: ${phone}\n\n${message}`);
    window.location.href = `mailto:mhdamouz@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  }

  return (
    <>
      <Reveal as="section" className="page-intro">
        <h1>ارتباط با ما</h1>
        <p>ما همیشه آماده شنیدن و پاسخگویی به سوالات شما هستیم. از طریق فرم زیر یا راه‌های دیگر ارتباطی با ما در تماس باشید.</p>
      </Reveal>

      <section className="contact-grid">
        <Reveal className="contact-form-card">
          <h2>ارسال پیام</h2>
          <form onSubmit={handleSubmit}>
            <div className="contact-form-row">
              <div className="contact-field">
                <label htmlFor="cf-name">نام و نام خانوادگی</label>
                <input id="cf-name" name="name" type="text" placeholder="مثال: علی محمدی" required />
              </div>
              <div className="contact-field">
                <label htmlFor="cf-phone">شماره تماس</label>
                <input id="cf-phone" name="phone" type="tel" placeholder="۰۹--- --- ----" required />
              </div>
            </div>
            <div className="contact-field">
              <label htmlFor="cf-subject">موضوع پیام</label>
              <input id="cf-subject" name="subject" type="text" placeholder="مثال: سفارش تایپ پایان‌نامه" />
            </div>
            <div className="contact-field">
              <label htmlFor="cf-message">متن پیام</label>
              <textarea id="cf-message" name="message" rows="5" placeholder="پیام خود را اینجا بنویسید..." required />
            </div>
            <button type="submit" className="btn-primary contact-submit">ارسال پیام</button>
            <p className="contact-form-note">با ارسال، برنامه ایمیل شما باز می‌شود تا پیام مستقیم برای ما ارسال شود.</p>
          </form>
        </Reveal>

        <Reveal className="contact-info-list">
          {CHANNELS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.external ? '_blank' : undefined}
              rel={c.external ? 'noopener' : undefined}
              className="contact-info-card"
            >
              <div className="contact-info-icon">
                {c.img ? <img src={c.img} alt={c.label} /> : c.icon}
              </div>
              <div><span className="contact-info-label">{c.label}</span><span className="contact-info-value">{c.value}</span></div>
            </a>
          ))}
          <div className="contact-info-card static">
            <div className="contact-info-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            </div>
            <div><span className="contact-info-label">ساعات پاسخگویی</span><span className="contact-info-value">هر روز، ۸ الی ۱۳ و ۱۷ الی ۲۱</span></div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
