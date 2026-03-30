import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LinkCard from '../components/LinkCard';

export default function Gaming() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header
        title="Gaming"
        subtitle="My gaming presence across platforms"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <LinkCard
          title="Steam"
          description="View my live Steam activity — recent games and achievements"
          url="/steam"
          icon="/window.svg"
          color="bg-slate-100 dark:bg-slate-900"
        />
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to homepage
        </Link>
      </div>

      <Footer />
    </div>
  );
}
