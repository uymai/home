import Footer from '../../components/Footer';
import Header from '../../components/Header';
import DartCheckoutClient from './DartCheckoutClient';

export default function DartCheckoutPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-xl mx-auto">
      <Header title="Checkout Chart" subtitle="Double out — what to throw to win" />
      <DartCheckoutClient />
      <Footer />
    </div>
  );
}
