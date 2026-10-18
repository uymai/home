import { describe, expect, it } from 'vitest';
import {
  bestItadDeal,
  extractPrice,
  extractProductSlugs,
  matchListings,
  parseProductSlug,
  parseWaitlist,
  slugify,
} from './lib.mjs';

describe('slugify', () => {
  it('matches Eneba-style slugs', () => {
    expect(slugify("Baldur's Gate 3")).toBe('baldurs-gate-3');
    expect(slugify('Ori and the Will of the Wisps')).toBe('ori-and-the-will-of-the-wisps');
    expect(slugify('Hades II')).toBe('hades-ii');
    expect(slugify('Pokémon: Legends & More')).toBe('pokemon-legends-and-more');
  });
});

describe('parseWaitlist', () => {
  it('reads ITAD-style JSON with nested game objects', () => {
    const json = JSON.stringify({ data: [{ id: 'abc', title: 'Hades II' }, { id: 'def', title: 'Celeste' }] });
    expect(parseWaitlist(json)).toEqual([
      { title: 'Hades II', itadId: 'abc' },
      { title: 'Celeste', itadId: 'def' },
    ]);
  });

  it('reads CSV with a title column and quoted commas', () => {
    const csv = 'id,title,added\n1,"Warhammer 40,000: Space Marine 2",2026-01-01\n2,Celeste,2026-01-02\n';
    expect(parseWaitlist(csv).map((g) => g.title)).toEqual(['Warhammer 40,000: Space Marine 2', 'Celeste']);
  });

  it('reads plain text, skipping blanks, comments, and duplicates', () => {
    expect(parseWaitlist('# my list\nHades II\n\nCeleste\nhades ii\n')).toEqual([
      { title: 'Hades II' },
      { title: 'Celeste' },
    ]);
  });
});

describe('parseProductSlug', () => {
  it('splits game and region', () => {
    expect(parseProductSlug('steam-hades-ii-pc-steam-key-global')).toEqual({ game: 'hades-ii', region: 'global' });
    expect(parseProductSlug('celeste-steam-key-north-america')).toEqual({ game: 'celeste', region: 'north-america' });
  });

  it('ignores gifts and other platforms', () => {
    expect(parseProductSlug('steam-hades-ii-pc-steam-gift-global')).toBeNull();
    expect(parseProductSlug('xbox-hades-ii-xbox-live-key-global')).toBeNull();
  });
});

describe('extractProductSlugs / matchListings', () => {
  const html = `
    <a href="/steam-hades-ii-pc-steam-key-global">Hades II</a>
    <a href="/steam-hades-ii-pc-steam-key-europe">Hades II EU</a>
    <a href="/steam-hades-ii-pc-steam-key-north-america?foo=1">Hades II NA</a>
    <a href="https://www.eneba.com/steam-hades-ii-deluxe-edition-pc-steam-key-global">Deluxe</a>
    <a href="/steam-hades-pc-steam-key-global">Hades</a>
    <a href="/steam-hades-ii-pc-steam-gift-global">Gift</a>`;

  it('finds Steam key product links', () => {
    expect(extractProductSlugs(html)).toEqual([
      'steam-hades-ii-pc-steam-key-global',
      'steam-hades-ii-pc-steam-key-europe',
      'steam-hades-ii-pc-steam-key-north-america',
      'steam-hades-ii-deluxe-edition-pc-steam-key-global',
      'steam-hades-pc-steam-key-global',
    ]);
  });

  it('keeps exact, Canada-usable listings in region order', () => {
    const matches = matchListings('Hades II', extractProductSlugs(html));
    expect(matches.map((m) => m.slug)).toEqual([
      'steam-hades-ii-pc-steam-key-north-america',
      'steam-hades-ii-pc-steam-key-global',
    ]);
  });

  it('includes editions when loose', () => {
    const matches = matchListings('Hades II', extractProductSlugs(html), { loose: true });
    expect(matches.map((m) => m.slug)).toContain('steam-hades-ii-deluxe-edition-pc-steam-key-global');
    expect(matches[matches.length - 1].exact).toBe(false);
  });
});

describe('extractPrice', () => {
  it('reads the lowest offer from JSON-LD', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Hades II',
      offers: { '@type': 'AggregateOffer', lowPrice: '31.49', highPrice: '40.00', priceCurrency: 'CAD' },
    })}</script>`;
    expect(extractPrice(html)).toEqual({ amount: 31.49, currency: 'CAD' });
  });

  it('handles @graph and offer arrays', () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"BreadcrumbList"},
      {"@type":"Product","offers":[{"price":"12.5","priceCurrency":"CAD"},{"price":"9.99","priceCurrency":"CAD"}]}]}</script>`;
    expect(extractPrice(html)).toEqual({ amount: 9.99, currency: 'CAD' });
  });

  it('falls back to price meta tags', () => {
    const html =
      '<meta property="product:price:amount" content="7.25"><meta content="CAD" property="product:price:currency">';
    expect(extractPrice(html)).toEqual({ amount: 7.25, currency: 'CAD' });
  });

  it('returns null when there is no price', () => {
    expect(extractPrice('<script type="application/ld+json">not json</script>')).toBeNull();
  });
});

describe('bestItadDeal', () => {
  it('picks the cheapest deal', () => {
    const entry = {
      id: 'abc',
      deals: [
        { shop: { name: 'Steam' }, price: { amount: 39.99, currency: 'CAD' }, cut: 0 },
        { shop: { name: 'GOG' }, price: { amount: 29.99, currency: 'CAD' }, cut: 25 },
      ],
    };
    expect(bestItadDeal(entry)).toEqual({ amount: 29.99, currency: 'CAD', shop: 'GOG', cut: 25 });
    expect(bestItadDeal({ id: 'x', deals: [] })).toBeNull();
  });
});
