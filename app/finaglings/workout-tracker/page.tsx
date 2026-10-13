import type { Metadata } from 'next';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WorkoutTrackerClient from './WorkoutTrackerClient';

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Tap through your AMRAP blocks and log rounds as you go.",
};

export default function WorkoutTrackerPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-xl mx-auto">
      <Header title="Workout Tracker" subtitle="Tap through your AMRAP blocks and log rounds as you go" />
      <WorkoutTrackerClient />
      <Footer />
    </div>
  );
}
