interface SkillCardProps {
  title: string;
  description: string;
  filename: string;
  note?: string;
}

export default function SkillCard({ title, description, filename, note }: SkillCardProps) {
  return (
    <div className="rounded-lg p-6 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-xl mb-2">{title}</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
          {note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{note}</p>
          )}
        </div>
        <a
          href={`/skills/${filename}`}
          download={filename}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md bg-purple-200 dark:bg-purple-800 hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>
    </div>
  );
}
