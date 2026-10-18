#!/usr/bin/env node
// Check Eneba prices for Canada-usable Steam keys against an IsThereAnyDeal
// waitlist. See README.md in this folder for setup.

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  DEFAULT_REGIONS,
  bestItadDeal,
  extractPrice,
  extractProductSlugs,
  matchListings,
  parseWaitlist,
  slugify,
} from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(HERE, '.itad-token.json');
const ITAD_API = 'https://api.isthereanydeal.com';
const ITAD_SITE = 'https://isthereanydeal.com';
const ENEBA = 'https://www.eneba.com';
const REDIRECT_PORT = 8765;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const { values: opts } = parseArgs({
  options: {
    file: { type: 'string', short: 'f' },
    login: { type: 'boolean' },
    regions: { type: 'string', default: DEFAULT_REGIONS.join(',') },
    loose: { type: 'boolean' },
    limit: { type: 'string' },
    delay: { type: 'string', default: '1500' },
    under: { type: 'string' },
    csv: { type: 'string' },
    json: { type: 'string' },
    debug: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (opts.help) {
  console.log(`Usage: node scripts/eneba-price-check/check.mjs [options]

Waitlist source (one of):
  --login              Sign in to IsThereAnyDeal (needs ITAD_CLIENT_ID) and save a token
  (default)            Read your waitlist from the ITAD API using the saved token or ITAD_TOKEN
  -f, --file <path>    Read titles from an ITAD export (JSON/CSV) or a text file, one per line

Options:
  --regions <list>     Eneba key regions to accept, best first (default: ${DEFAULT_REGIONS.join(',')})
  --loose              Also accept editions (e.g. "Deluxe Edition") of a waitlisted game
  --under <price>      Only show games whose Eneba price is at or below this
  --limit <n>          Only check the first n games
  --delay <ms>         Pause between Eneba requests (default 1500)
  --csv <path>         Also write results as CSV
  --json <path>        Also write results as JSON
  --debug <dir>        Save fetched Eneba pages to <dir> for troubleshooting

Environment:
  ITAD_CLIENT_ID       OAuth client id of your ITAD app (for --login)
  ITAD_TOKEN           ITAD OAuth access token (instead of --login)
  ITAD_API_KEY         ITAD API key: adds the best official-store price in Canada for comparison
  ENEBA_COOKIE         Cookie header copied from your browser, if Eneba blocks the script`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- IsThereAnyDeal ---------------------------------------------------------

async function login() {
  const clientId = process.env.ITAD_CLIENT_ID;
  if (!clientId) throw new Error('Set ITAD_CLIENT_ID to your app\'s OAuth client id (see README.md).');

  const redirectUri = `http://localhost:${REDIRECT_PORT}/callback`;
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('hex');
  const authUrl = new URL(`${ITAD_SITE}/oauth/authorize/`);
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'wait_read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== '/callback') return res.writeHead(404).end();
      const error = url.searchParams.get('error');
      const ok = !error && url.searchParams.get('state') === state && url.searchParams.get('code');
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/plain' });
      res.end(ok ? 'Signed in. You can close this tab.' : `Sign-in failed: ${error ?? 'state mismatch'}`);
      server.close();
      if (ok) resolve(url.searchParams.get('code'));
      else reject(new Error(`ITAD sign-in failed: ${error ?? 'state mismatch'}`));
    });
    server.listen(REDIRECT_PORT, () => {
      console.log(`Open this URL in your browser to sign in to IsThereAnyDeal:\n\n  ${authUrl}\n`);
    });
  });

  const res = await fetch(`${ITAD_SITE}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`ITAD token exchange failed: ${res.status} ${await res.text()}`);
  writeFileSync(TOKEN_FILE, JSON.stringify(await res.json(), null, 2), { mode: 0o600 });
  console.log(`Saved token to ${TOKEN_FILE}`);
}

function itadToken() {
  if (process.env.ITAD_TOKEN) return process.env.ITAD_TOKEN;
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return null;
}

async function fetchWaitlist() {
  const token = itadToken();
  if (!token) {
    throw new Error('No waitlist source: run with --login, set ITAD_TOKEN, or pass --file <export>.');
  }
  const res = await fetch(`${ITAD_API}/waitlist/games/v1`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    throw new Error('ITAD rejected the token. Run with --login again.');
  }
  if (!res.ok) throw new Error(`ITAD waitlist request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).map((g) => ({ title: g.title, itadId: g.id }));
}

async function lookupItadIds(games, key) {
  for (const game of games) {
    if (game.itadId) continue;
    const url = `${ITAD_API}/games/lookup/v1?${new URLSearchParams({ key, title: game.title })}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.found) game.itadId = data.game.id;
    }
  }
}

/** Best current price in Canada across ITAD's official stores, by ITAD id. */
async function fetchItadPrices(ids, key) {
  const prices = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const url = `${ITAD_API}/games/prices/v3?${new URLSearchParams({ key, country: 'CA', deals: 'false' })}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids.slice(i, i + 200)),
    });
    if (!res.ok) throw new Error(`ITAD prices request failed: ${res.status} ${await res.text()}`);
    for (const entry of await res.json()) prices.set(entry.id, bestItadDeal(entry));
  }
  return prices;
}

// --- Eneba ------------------------------------------------------------------

let enebaRequests = 0;

async function enebaGet(path, debugName) {
  if (enebaRequests++ > 0) await sleep(Number(opts.delay));
  const res = await fetch(`${ENEBA}${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-CA,en;q=0.9',
      // Ask for Canadian region/currency; a pasted browser cookie overrides it.
      Cookie: process.env.ENEBA_COOKIE ?? 'region=canada; exchange=CAD; currency=CAD',
    },
  });
  const html = await res.text();
  if (opts.debug) {
    mkdirSync(opts.debug, { recursive: true });
    writeFileSync(join(opts.debug, `${debugName}.html`), html);
  }
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429 || /cf-chl|Just a moment\.\.\./.test(html)) {
    throw new Error(
      `Eneba blocked the request (HTTP ${res.status}). Open eneba.com in your browser, copy the ` +
        'Cookie request header from dev tools into ENEBA_COOKIE, and try again (or raise --delay).',
    );
  }
  if (!res.ok) throw new Error(`Eneba request failed: HTTP ${res.status} for ${path}`);
  return html;
}

async function checkEneba(game, regions) {
  const slug = slugify(game.title);
  const query = new URLSearchParams({ text: game.title });
  query.append('drms[]', 'steam');
  const searchHtml = await enebaGet(`/store/all?${query}`, `search-${slug}`);
  let listings = matchListings(game.title, extractProductSlugs(searchHtml ?? ''), { regions, loose: opts.loose });

  // Search came up empty: try the slug Eneba would most likely use.
  if (listings.length === 0) {
    listings = regions.flatMap((region) => [
      { slug: `steam-${slug}-pc-steam-key-${region}`, region, exact: true },
      { slug: `steam-${slug}-steam-key-${region}`, region, exact: true },
    ]);
  }

  let best = null;
  let checked = 0;
  for (const listing of listings) {
    if (checked >= 3) break;
    const html = await enebaGet(`/${listing.slug}`, listing.slug);
    if (!html) continue;
    checked++;
    const price = extractPrice(html);
    if (price && (!best || price.amount < best.amount)) {
      best = { ...price, region: listing.region, url: `${ENEBA}/${listing.slug}` };
    }
  }
  return best;
}

// --- Output -----------------------------------------------------------------

function money(p) {
  return p ? `${p.amount.toFixed(2)} ${p.currency}` : '—';
}

function printTable(rows) {
  const table = rows.map((r) => [
    r.title,
    money(r.eneba),
    r.eneba?.region ?? '',
    r.official ? `${money(r.official)} (${r.official.shop})` : '',
    // Positive means Eneba is cheaper than the best official store.
    r.savings == null ? '' : r.savings.toFixed(2),
  ]);
  const header = ['Game', 'Eneba', 'Region', 'Best official (CA)', 'Save'];
  const widths = header.map((h, i) => Math.max(h.length, ...table.map((row) => row[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  console.log(`\n${line(header)}\n${widths.map((w) => '-'.repeat(w)).join('  ')}`);
  for (const row of table) console.log(line(row));
  console.log();
  for (const r of rows) if (r.eneba) console.log(`${r.title}: ${r.eneba.url}`);
}

function toCsv(rows) {
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [['title', 'eneba_price', 'eneba_currency', 'eneba_region', 'eneba_url', 'official_price', 'official_shop', 'savings']];
  for (const r of rows) {
    lines.push([r.title, r.eneba?.amount, r.eneba?.currency, r.eneba?.region, r.eneba?.url, r.official?.amount, r.official?.shop, r.savings]);
  }
  return lines.map((l) => l.map(esc).join(',')).join('\n') + '\n';
}

// --- Main -------------------------------------------------------------------

async function main() {
  if (opts.login) return login();

  let games = opts.file ? parseWaitlist(readFileSync(opts.file, 'utf8')) : await fetchWaitlist();
  if (opts.limit) games = games.slice(0, Number(opts.limit));
  if (games.length === 0) throw new Error('The waitlist is empty.');
  const regions = opts.regions.split(',').map((r) => r.trim()).filter(Boolean);

  const apiKey = process.env.ITAD_API_KEY;
  let official = new Map();
  if (apiKey) {
    await lookupItadIds(games, apiKey);
    const ids = games.map((g) => g.itadId).filter(Boolean);
    if (ids.length) official = await fetchItadPrices(ids, apiKey);
  }

  console.log(`Checking ${games.length} game(s) on Eneba (regions: ${regions.join(', ')})...`);
  const rows = [];
  for (const [i, game] of games.entries()) {
    process.stdout.write(`  [${i + 1}/${games.length}] ${game.title} ... `);
    let eneba = null;
    try {
      eneba = await checkEneba(game, regions);
      console.log(eneba ? money(eneba) : 'not found');
    } catch (err) {
      console.log('error');
      if (/blocked/.test(err.message)) throw err;
      console.error(`    ${err.message}`);
    }
    const off = game.itadId ? official.get(game.itadId) ?? null : null;
    const savings = eneba && off && eneba.currency === off.currency ? +(off.amount - eneba.amount).toFixed(2) : null;
    rows.push({ title: game.title, itadId: game.itadId, eneba, official: off, savings });
  }

  const under = opts.under == null ? null : Number(opts.under);
  const shown = rows
    .filter((r) => under == null || (r.eneba && r.eneba.amount <= under))
    .sort((a, b) => (a.eneba?.amount ?? Infinity) - (b.eneba?.amount ?? Infinity));

  printTable(shown);
  const otherCurrency = shown.find((r) => r.eneba && r.eneba.currency !== 'CAD');
  if (otherCurrency) {
    console.log(`\nNote: Eneba returned ${otherCurrency.eneba.currency} prices. Set ENEBA_COOKIE from a browser session with CAD selected to get CAD.`);
  }
  if (opts.csv) writeFileSync(opts.csv, toCsv(shown));
  if (opts.json) writeFileSync(opts.json, JSON.stringify(shown, null, 2));
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
