import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import DartGameClient from './DartGameClient';

export const metadata: Metadata = {
  title: "Dart Game",
  description: "Click the board — 3 darts per round.",
};

export default function DartGamePage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-xl mx-auto">
      <Header title="Dart Game" subtitle="Click the board — 3 darts per round" />
      <DartGameClient />
      <Footer />
    </div>
  );
}
