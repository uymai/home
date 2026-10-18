# Eneba price check

Checks Eneba for Steam keys that activate in Canada (Canada, North America or
Global region keys) for every game on your IsThereAnyDeal waitlist. You can
also have it show the best official-store price in Canada from ITAD next to
each one.

Needs Node 20+ and nothing else. Run it from the repo root:

```bash
npm run eneba -- [options]     # or: node scripts/eneba-price-check/check.mjs [options]
```

## Getting your waitlist

**Option A: export a file (simplest).** On isthereanydeal.com, export your
waitlist (JSON or CSV) and pass it in:

```bash
npm run eneba -- --file ~/Downloads/waitlist.json
```

A plain text file with one title per line works too.

**Option B: read it straight from the ITAD API.**

1. Register an app at https://isthereanydeal.com/apps/my/ and set its OAuth
   redirect URL to `http://localhost:8765/callback`. Note the **client id**
   and the **API key**.
2. Sign in once. This saves a token to `.itad-token.json` in this folder,
   which git ignores:

   ```bash
   ITAD_CLIENT_ID=... npm run eneba -- --login
   ```

3. After that, run it with no `--file`:

   ```bash
   npm run eneba
   ```

## Comparing with official stores

Set `ITAD_API_KEY` and each row also shows the cheapest current price in
Canada across ITAD's official stores (Steam, GOG, Humble, etc.). The **Save**
column is how much less Eneba charges:

```bash
ITAD_API_KEY=... npm run eneba -- --file waitlist.json
```

## Options

| Option | What it does |
| --- | --- |
| `--under 20` | Only list games at or under $20 on Eneba |
| `--loose` | Also accept editions (e.g. "Deluxe Edition") of a waitlisted game |
| `--regions canada,north-america,global` | Key regions to accept, best first |
| `--limit 5` | Only check the first 5 games (handy for a test run) |
| `--delay 1500` | Milliseconds between Eneba requests (be gentle) |
| `--csv out.csv` / `--json out.json` | Save the results |
| `--debug pages/` | Save every Eneba page fetched, to see why a game was missed |

## How it finds prices

For each title it searches Eneba's store for Steam products, keeps listings
whose URL slug matches the title (`steam-<game>-pc-steam-key-<region>`) and
whose region works in Canada, then reads the price from the product page's
structured data. Only Steam **keys** count; gifts and accounts are skipped,
and ROW/EU/US keys are left out because they may not activate in Canada.

Eneba is a marketplace, so the price is the cheapest seller's at that moment.

## Troubleshooting

- **"Eneba blocked the request"**: Eneba's bot protection kicked in. Open
  eneba.com in your browser (with the currency set to CAD), copy the `Cookie`
  request header from the dev tools Network tab, and run with
  `ENEBA_COOKIE='...'`. Raising `--delay` helps too.
- **Prices in EUR/USD**: same fix. The cookie from a CAD browser session sets
  the currency.
- **A game shows "not found"**: run it with `--limit` and `--debug pages/` and
  look at the saved search page. Titles with odd punctuation sometimes slug
  differently on Eneba.
