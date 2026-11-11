export interface WishlistItem {
  name: string;
  url?: string;
  price?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export const WISHLIST: WishlistItem[] = [
  {
    name: 'Ticket to Ride Legacy: Legends of the West',
    url: 'https://store.401games.ca/products/ticket-to-ride-legacy-legends-of-the-west',
    price: '$135.95',
    priority: 'medium',
    notes: 'Legacy version of Ticket to Ride — has a literal end to the campaign. Super expensive but on the list.',
  },
  {
    name: 'Amazon Gift Card',
    url: 'https://www.amazon.ca/gp/product/B004M5HUAC/',
    priority: 'medium',
  },
  {
    name: 'Steam Gift Card',
    priority: 'medium',
    notes: 'Buying online goes straight to my account, so you may need to grab one in person (gas station, etc.).',
  },
  {
    name: 'Ito',
    url: 'https://store.401games.ca/products/ito',
    price: '$15–$20',
    priority: 'medium',
    notes: 'Has been hard to get — Amazon scalpers are listing it for $60, so check 401 Games or local stores.',
  },
  {
    name: 'This Game is Killer',
    url: 'https://store.401games.ca/products/this-game-is-killer',
    price: '~$18',
    priority: 'medium',
    notes: 'Funny horror-survival party game about an alien loose on a cargo ship — rounds take about ten minutes, and death comes quickly.',
  },
  {
    name: 'Magical Athlete: Second Wind',
    url: 'https://store.401games.ca/products/magical-athlete-second-wind',
    price: '$37.95',
    priority: 'medium',
    notes: 'Zany dice-racing party game (2–6 players, ~30 min) where each bizarre athlete breaks the rules in its own way. Pre-order at 401 Games, projected release Q2 2027.',
  },
  {
    name: 'Hot Streak',
    url: 'https://store.401games.ca/products/hot-streak',
    price: '$49.95',
    priority: 'medium',
    notes: 'Mascot-racing betting game: draft bets, sneak cards into the race deck, then scream at the racers as they swerve, turn around, and get knocked over.',
  },
  {
    name: 'CPAP Hose Holder',
    url: 'https://a.co/d/dXgojaY',
    priority: 'low',
  },
];
