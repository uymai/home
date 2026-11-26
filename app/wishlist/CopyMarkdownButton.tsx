'use client';

import { useState } from 'react';

export default function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState('copied');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {state === 'copied' ? 'Copied!' : state === 'error' ? 'Copy failed' : 'Copy as Markdown'}
    </button>
  );
}
