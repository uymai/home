import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { WISHLIST, type WishlistItem } from './items';

const PRIORITY_ORDER: WishlistItem['priority'][] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<WishlistItem['priority'], string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Nice to Have',
};

export default function Wishlist() {
  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = WISHLIST.filter((item) => item.priority === p);
    return acc;
  }, {} as Record<WishlistItem['priority'], WishlistItem[]>);

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header title="Wishlist" subtitle="Things I'd love to have" />

      {PRIORITY_ORDER.map((priority) => {
        const items = grouped[priority];
        if (items.length === 0) return null;
        return (
          <div key={priority} className="mb-12">
            <h3 className="text-xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
              {PRIORITY_LABELS[priority]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-lg text-blue-600 dark:text-blue-400 hover:underline leading-snug"
                      >
                        {item.name}
                      </a>
                    ) : (
                      <span className="font-bold text-lg leading-snug">{item.name}</span>
                    )}
                    {item.price && (
                      <span className="shrink-0 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {item.price}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {WISHLIST.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-12">Nothing here yet — check back soon!</p>
      )}

      <div className="mt-8 text-center">
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
