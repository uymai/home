# CLAUDE.md

## Project Overview

Personal homepage built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4. Contains several mini-apps and pages:

- **Recipes** (`/recipes`) — recipe browser backed by JSON data in `data/`
- **Steve's Game** (`/steves-game`) — number-based game with hardcoded ROB_HARD_NUMBERS
- **Gaming** (`/gaming`) — gaming-related page
- **Finaglings** (`/finaglings`) — miscellaneous page
- **Magic Square** (`/magic-square`) — magic square generator
- **Warp Protocol** (`/warp-protocol`) — simulation with step-through (Next Pick / Next Round) buttons
- **Discord** (`/discord`) — Discord-related page
- **Contact** (`/contact`) — contact page

## Commands

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Run tests then build
npm run test       # Run Vitest tests (also runs before build)
npm run test:watch # Watch mode tests
npm run lint       # ESLint
```

## Architecture

- `app/` — Next.js App Router pages and components
- `app/components/` — Shared components (Header, Footer, LinkCard, etc.)
- `lib/` — Shared utilities (e.g., `recipes.ts`)
- `data/` — Static JSON data files
- `test/` — Test files (Vitest)
- `skills/` — Claude Code custom skills

## Testing

Tests use Vitest. Run `npm test` before committing. The `prebuild` script runs tests automatically.

Test files live in both `test/` and colocated with source (e.g., `app/warp-protocol/engine.test.ts`).
