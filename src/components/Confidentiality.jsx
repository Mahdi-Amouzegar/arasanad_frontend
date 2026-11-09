import Reveal from './Reveal';

const CONFIDENTIALITY_IMG = '/images/site/confidentiality.avif';

export default function Confidentiality() {
  return (
    <Reveal as="section" className="confidentiality">
      <div className="confidentiality-grid">
        <div className="confidentiality-text">
          <h2>اطلاعات شما نزد ما امن است</h2>
          <p>
            می‌دانیم که بسیاری از اسناد شما — به‌ویژه پایان‌نامه و پروژه‌های تحقیقاتی — پیش از انتشار رسمی
            باید کاملاً محرمانه بمانند. آراسند متعهد است محتوای هیچ سندی را با شخص یا نهاد ثالثی به اشتراک
            نگذارد.
          </p>
        </div>
        <div className="confidentiality-visual">
          <img src={CONFIDENTIALITY_IMG} alt="محیط کاری امن برای ویرایش اسناد شما" loading="lazy" />
        </div>
      </div>
    </Reveal>
  );
}
