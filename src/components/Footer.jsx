export default function Footer() {
  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <span className="brand-part">آرا</span><span className="brand-part brand-accent">سند</span>
          </span>
          <p className="footer-desc">
            آراسند، همراه شما در تایپ، ویرایش، صفحه‌آرایی و آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری.
          </p>
        </div>

        <div className="footer-col">
          <h4>دسترسی سریع</h4>
          <ul>
            <li><a href="/#services">خدمات</a></li>
            <li><a href="/pricing">تعرفه‌ها</a></li>
            <li><a href="/portfolio">نمونه‌کار</a></li>
            <li><a href="/about">درباره ما</a></li>
            <li><a href="/contact">ارتباط با ما</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>راه‌های ارتباط</h4>
          <ul>
            <li><a href="https://t.me/Mehdi_Amouz" target="_blank" rel="noopener">تلگرام: ‎@Mehdi_Amouz</a></li>
            <li><a href="https://ble.ir/mehdi_amouz" target="_blank" rel="noopener">بله: ‎@mehdi_amouz</a></li>
            <li><a href="tel:+989364272899">تماس تلفنی: ۰۹۳۶۴۲۷۲۸۹۹</a></li>
            <li><a href="mailto:mhdamouz@gmail.com">ایمیل: mhdamouz@gmail.com</a></li>
            <li><a href="https://typeiran.com/user/18673" target="_blank" rel="noopener">پنل کاربری typeiran</a></li>
          </ul>
          <p className="footer-hours">ساعات پاسخگویی: هر روز، ۸ الی ۱۳ و ۱۷ الی ۲۱</p>
          <div className="footer-social">
            <a href="https://t.me/Mehdi_Amouz" target="_blank" rel="noopener" aria-label="تلگرام آراسند" className="social-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 3 2 11l6 2 2 6 3-4 5 4z" /><path d="M10 13l9-8" />
              </svg>
            </a>
            <a href="https://ble.ir/mehdi_amouz" target="_blank" rel="noopener" aria-label="بله آراسند" className="social-icon">
              <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bale.svg" alt="بله" loading="lazy" />
            </a>
            <a href="https://typeiran.com/user/18673" target="_blank" rel="noopener" aria-label="پنل کاربری آراسند در typeiran" className="social-icon">
              <img src="https://www.google.com/s2/favicons?sz=64&domain=typeiran.com" alt="typeiran" loading="lazy" />
            </a>
            <a href="tel:+989364272899" aria-label="تماس تلفنی آراسند" className="social-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
            {/* TODO: در صورت داشتن سایر شبکه‌های اجتماعی (اینستاگرام و...) لینک آن را همین‌جا اضافه کنید */}
          </div>
        </div>
      </div>

      {/* TODO: در صورت داشتن نماد اعتماد الکترونیکی (اینماد)، کد یا تصویر آن را اینجا جایگزین کنید */}
      <div className="footer-bottom">
        <p>© <span className="brand-part">آرا</span><span className="brand-part brand-accent">سند</span> — تمامی حقوق محفوظ است.</p>
      </div>
    </footer>
  );
}
