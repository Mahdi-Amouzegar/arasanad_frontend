import Hero from '../components/Hero';
import WhyUs from '../components/WhyUs';
import Services from '../components/Services';
import HowItWorks from '../components/HowItWorks';
import Trust from '../components/Trust';
import Confidentiality from '../components/Confidentiality';
import Testimonials from '../components/Testimonials';
import OrderCTA from '../components/OrderCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <WhyUs />
      <HowItWorks />
      <Trust />
      <Confidentiality />
      <Testimonials />
      <OrderCTA />
    </>
  );
}
