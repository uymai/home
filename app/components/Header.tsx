import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-12 text-center">
      <Link href="/" className="inline-block">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-xl text-gray-600 dark:text-gray-400">{subtitle}</p>
        )}
      </Link>
    </header>
  );
} 