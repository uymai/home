import Image from 'next/image';
import Link from 'next/link';

interface LinkCardProps {
  title: string;
  description: string;
  url: string;
  icon?: string;
  color?: string;
}

export default function LinkCard({ title, description, url, icon, color = 'bg-blue-100 dark:bg-blue-950' }: LinkCardProps) {
  const isExternal = url.startsWith('http');
  
  return (
    <div className={`rounded-lg p-6 transition-all hover:scale-105 ${color}`}>
      <Link 
        href={url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="flex flex-col h-full"
      >
        <div className="flex items-center mb-3">
          {icon && (
            <div className="mr-3">
              <Image 
                src={icon} 
                alt={`${title} icon`} 
                width={24} 
                height={24}
                className="dark:invert"
              />
            </div>
          )}
          <h3 className="font-bold text-xl">{title}</h3>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 flex-grow">{description}</p>
        <div className="mt-4 text-sm font-medium flex items-center">
          {isExternal ? (
            <>
              Visit site
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </>
          ) : (
            <>
              View details
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </div>
      </Link>
    </div>
  );
} 