export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-16 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>© {currentYear} uymai.net. All rights reserved.</p>
    </footer>
  );
} 