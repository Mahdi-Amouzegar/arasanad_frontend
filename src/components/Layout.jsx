import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import FabStack from './FabStack';
import MobileCTA from './MobileCTA';

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <MobileCTA />
      <FabStack />
    </>
  );
}
