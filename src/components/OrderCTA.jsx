import { Link } from 'react-router-dom';
import Reveal from './Reveal';
import { spawnRipple } from '../utils/ripple';

export default function OrderCTA() {
  return (
    <Reveal as="section" className="order-cta" id="order">
      <h2>آماده‌اید سند خود را بسپارید به آراسند؟</h2>
      <Link to="/contact" className="btn-primary" onClick={spawnRipple}>
        ثبت سفارش
      </Link>
      <p className="order-email">
        یا ایمیل بزنید: <a href="mailto:mhdamouz@gmail.com">mhdamouz@gmail.com</a>
      </p>
    </Reveal>
  );
}
