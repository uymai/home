import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Bobs27Client from './Bobs27Client';

export default function Bobs27Page() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-xl mx-auto">
      <Header title="Bob's 27" subtitle="Doubles practice scorer" />
      <Bobs27Client />
      <Footer />
    </div>
  );
}
