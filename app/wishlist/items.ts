export interface WishlistItem {
  name: string;
  url?: string;
  price?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export const WISHLIST: WishlistItem[] = [];
