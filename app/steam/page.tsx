import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SteamProfile from './SteamProfile';

export const metadata = {
  title: 'Steam Activity — uymai.net',
  description: 'Live Steam profile, recently played games, and achievements.',
};

export default function SteamPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto">
      <Header
        title="Steam Activity"
        subtitle="Live stats from the Steam Web API"
      />

      <SteamProfile />

      <div className="mt-12 text-center">
        <Link
          href="/gaming"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Gaming
        </Link>
      </div>

      <Footer />
    </div>
  );
}
