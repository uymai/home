import { describe, it, expect } from 'vitest';
import { wishlistToMarkdown } from './markdown';

describe('wishlistToMarkdown', () => {
  it('groups by priority and formats links, prices, and notes', () => {
    const md = wishlistToMarkdown([
      { name: 'Low thing', priority: 'low' },
      { name: 'Game [x]', url: 'https://example.com', price: '$10', priority: 'high', notes: 'Fun.' },
    ]);
    expect(md).toBe(
      '# Wishlist\n\n' +
        '## High Priority\n\n- [Game \\[x\\]](https://example.com) — $10\n  Fun.\n\n' +
        '## Nice to Have\n\n- Low thing\n'
    );
  });

  it('omits empty priority groups', () => {
    expect(wishlistToMarkdown([])).toBe('# Wishlist\n\n\n');
  });
});
