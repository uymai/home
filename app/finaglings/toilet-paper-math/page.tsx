import Footer from '../../components/Footer';
import Header from '../../components/Header';
import ToiletPaperMathClient from './ToiletPaperMathClient';

export default function ToiletPaperMathPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
      <Header
        title="Toilet Paper Math"
        subtitle="Which deal is actually better? Enter the price and count for two options."
      />
      <ToiletPaperMathClient />
      <Footer />
    </div>
  );
}
