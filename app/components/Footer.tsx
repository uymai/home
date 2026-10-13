export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-16 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>© {currentYear} uymai.net · <a href="https://github.com/uymai/home" className="underline hover:text-gray-700 dark:hover:text-gray-200">MIT licensed</a></p>
    </footer>
  );
} 