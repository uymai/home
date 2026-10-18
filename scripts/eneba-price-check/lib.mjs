// Pure helpers for check.mjs: reading a waitlist, picking Eneba listings, and
// pulling prices out of product pages. No network access here, so it's testable.

// Eneba key regions (the suffix of a product slug) that activate in Canada.
export const DEFAULT_REGIONS = ['canada', 'north-america', 'global'];

/** Lowercase, strip accents/symbols, and join words with dashes, like Eneba slugs. */
export function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse an ITAD waitlist export, or a hand-written list, into games.
 * Accepts JSON (an array, or an object with a list under any key), CSV with a
 * "title" column, or plain text with one title per line.
 * @returns {{ title: string, itadId?: string }[]}
 */
export function parseWaitlist(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return dedupe(collectJsonGames(JSON.parse(trimmed)));
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleCol = header.findIndex((h) => h === 'title' || h === 'name' || h === 'game');
  if (titleCol !== -1) {
    const idCol = header.findIndex((h) => h === 'id' || h === 'itad_id' || h === 'gid');
    return dedupe(
      lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        return { title: cells[titleCol]?.trim() ?? '', itadId: idCol === -1 ? undefined : cells[idCol]?.trim() };
      }),
    );
  }
  return dedupe(lines.map((l) => ({ title: l.trim() })));
}

function collectJsonGames(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === 'string') out.push({ title: item });
      else collectJsonGames(item, out);
    }
  } else if (node && typeof node === 'object') {
    if (typeof node.title === 'string') {
      out.push({ title: node.title, itadId: typeof node.id === 'string' ? node.id : node.gid });
    } else {
      for (const value of Object.values(node)) collectJsonGames(value, out);
    }
  }
  return out;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function dedupe(games) {
  const seen = new Set();
  return games.filter((g) => {
    const key = slugify(g.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Split an Eneba product slug like "steam-hades-ii-pc-steam-key-global" into
 * the game part ("hades-ii") and region ("global"). Returns null for anything
 * that isn't a Steam key (gifts, accounts, other platforms).
 */
export function parseProductSlug(slug) {
  const m = /^(?:steam-)?(.+?)-steam-key-([a-z-]+)$/.exec(slug);
  if (!m) return null;
  const game = m[1].replace(/-(?:pc|pc-mac|pc-mac-linux|pc-linux)$/, '');
  return { game, region: m[2] };
}

/** Unique Eneba product slugs linked from a search results page. */
export function extractProductSlugs(html) {
  const slugs = new Set();
  for (const m of html.matchAll(/href="(?:https:\/\/www\.eneba\.com)?\/([a-z0-9-]+-steam-key-[a-z-]+)(?:[?#"])/g)) {
    slugs.add(m[1]);
  }
  return [...slugs];
}

/**
 * Pick the Eneba listings that match a game title and are usable in Canada,
 * best region first (a Canada key, then North America, then Global).
 * With loose matching, editions like "...-deluxe-edition" also count.
 */
export function matchListings(title, slugs, { regions = DEFAULT_REGIONS, loose = false } = {}) {
  const want = slugify(title);
  const matches = [];
  for (const slug of slugs) {
    const parsed = parseProductSlug(slug);
    if (!parsed || !regions.includes(parsed.region)) continue;
    const exact = parsed.game === want;
    if (exact || (loose && parsed.game.startsWith(`${want}-`))) {
      matches.push({ slug, region: parsed.region, exact });
    }
  }
  return matches.sort(
    (a, b) => Number(b.exact) - Number(a.exact) || regions.indexOf(a.region) - regions.indexOf(b.region),
  );
}

/**
 * Find the lowest offer price on an Eneba product page, from its JSON-LD
 * Product block, falling back to og/product price meta tags.
 * @returns {{ amount: number, currency: string } | null}
 */
export function extractPrice(html) {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const price = findOfferPrice(data);
    if (price) return price;
  }

  const amount = metaContent(html, 'product:price:amount') ?? metaContent(html, 'og:price:amount');
  const currency = metaContent(html, 'product:price:currency') ?? metaContent(html, 'og:price:currency');
  if (amount && currency && Number.isFinite(Number(amount))) return { amount: Number(amount), currency };
  return null;
}

function findOfferPrice(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findOfferPrice(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  if (node['@graph']) return findOfferPrice(node['@graph']);
  if (node.offers) {
    const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
    let best = null;
    for (const offer of offers) {
      const amount = Number(offer.lowPrice ?? offer.price);
      if (!Number.isFinite(amount) || !offer.priceCurrency) continue;
      if (!best || amount < best.amount) best = { amount, currency: offer.priceCurrency };
    }
    return best;
  }
  return null;
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m =
    new RegExp(`<meta[^>]+(?:property|name)="${escaped}"[^>]+content="([^"]+)"`).exec(html) ??
    new RegExp(`<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="${escaped}"`).exec(html);
  return m?.[1] ?? null;
}

/** Best (cheapest) current deal from an ITAD games/prices/v3 entry. */
export function bestItadDeal(entry) {
  let best = null;
  for (const deal of entry?.deals ?? []) {
    if (!best || deal.price.amount < best.amount) {
      best = { amount: deal.price.amount, currency: deal.price.currency, shop: deal.shop.name, cut: deal.cut };
    }
  }
  return best;
}
