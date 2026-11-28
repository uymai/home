import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import CubeTimerClient from './CubeTimerClient';

export const metadata: Metadata = {
  title: "Cube Timer",
  description: "A Rubik's cube timer with averages, best times, a progress chart, and export/import.",
};

export default function CubeTimerPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
      <Header title="Cube Timer" subtitle="Tap or press space to start and stop. Time shown to the hundredth, no flickering thousandths." />
      <CubeTimerClient />
      <Footer />
    </div>
  );
}
