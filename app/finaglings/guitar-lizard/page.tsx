import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import GuitarLizardClient from './GuitarLizardClient';

export const metadata: Metadata = {
  title: "Guitar Lizard",
  description: "Scale shapes for the fretboard.",
};

export default function GuitarLizardPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-xl mx-auto">
      <Header title="Guitar Lizard" subtitle="Scale shapes for the fretboard" />
      <GuitarLizardClient />
      <Footer />
    </div>
  );
}
