import type { WishlistItem } from './items';

const PRIORITY_ORDER: WishlistItem['priority'][] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<WishlistItem['priority'], string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Nice to Have',
};

function escapeLinkText(text: string): string {
  return text.replace(/([\[\]\\])/g, '\\$1');
}

export function wishlistToMarkdown(items: WishlistItem[]): string {
  const sections = PRIORITY_ORDER.flatMap((priority) => {
    const group = items.filter((item) => item.priority === priority);
    if (group.length === 0) return [];
    const lines = group.map((item) => {
      const name = item.url ? `[${escapeLinkText(item.name)}](${item.url})` : item.name;
      let line = `- ${name}`;
      if (item.price) line += ` — ${item.price}`;
      if (item.notes) line += `\n  ${item.notes}`;
      return line;
    });
    return [`## ${PRIORITY_LABELS[priority]}\n\n${lines.join('\n')}`];
  });
  return `# Wishlist\n\n${sections.join('\n\n')}\n`;
}
