import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header title="uymai.net" subtitle="Page not found" />
      <main className="text-center">
        <p className="text-6xl font-bold tracking-tight">404</p>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Nothing lives here. It may have been a finagling that didn&apos;t make the cut.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-indigo-100 px-5 py-2 font-medium hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900"
        >
          Back to the home page
        </Link>
      </main>
      <Footer />
    </div>
  );
}
