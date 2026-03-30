---
name: warp-protocol-dev
description: Add modules, tune balance, add game versions, debug with deterministic RNG, and write engine tests for the Warp Protocol roguelike deck-builder. Use when asked to change any aspect of the game at app/warp-protocol/, including new CoreKind types, MODULE_BLUEPRINTS entries, EFFECT_RESOLVERS, CATALOGS, balance constants, seed logic, or engine test coverage.
---

# Warp Protocol Dev

## Overview

All game logic in Warp Protocol lives in `engine.ts` as pure functions with no React dependencies. `WarpProtocolClient.tsx` is a thin `useReducer` shell that dispatches actions and reads state. Changes to gameplay always start in `engine.ts`, types live in `types.ts`, and every behavioral change is verified through `engine.test.ts`.

The engine is a deterministic state machine: `reduceGameState(state, action)` dispatches to private handlers (`drawModule`, `bankRound`, `bustRound`, `buyModule`, `buyUpgrade`, `startNextRound`) that return new state objects. RNG derives from a seed via FNV-1a hash and xorshift, making any run fully reproducible from its seed string.

## Workflow

1. Identify which task category applies: new module type, balance tuning, new game version, debugging, or test coverage.
2. Read `engine.ts` and `types.ts` in full before writing anything — understand existing patterns before adding to them.
3. Make the minimal coherent change starting in `engine.ts`; update `types.ts` only when new types are required.
4. Add or update tests in `engine.test.ts` to cover the new behavior.
5. Verify with a targeted test run, then the full suite and lint.

## Decision Rules

### Adding a new module type

- Add the `CoreKind` literal to the union in `types.ts` first — TypeScript exhaustiveness checks will surface any missed cases downstream.
- Add a `MODULE_BLUEPRINTS` entry in `engine.ts` with all required fields in order: `name`, `kind`, `tier`, `costFlux`, `costCredits`, `genFlux`, `genCredits`, `addInstability`. Add optional fields after: `effectDescription`, `sponsored`, `isWarpCore`.
- If the module has a context-dependent effect (scales with active pile size, counts specific kinds, etc.), add a resolver to `EFFECT_RESOLVERS` using the `DrawContext` type. Keep resolvers pure — no mutations.
- Add the kind to the `shopPool` of the target `GameVersion` entry in `CATALOGS`.
- Always set `effectDescription` on any module with a resolver so the client UI can display the effect text.

### Tuning balance

- Global constants to edit: `START_SLOT_CAPACITY`, `START_INSTABILITY_THRESHOLD`, `START_SLOT_CAPACITY_COST`, `START_INSTABILITY_COST`, `WARP_CORE_TARGET`.
- Per-module values live in `MODULE_BLUEPRINTS` — edit in place.
- Starting hand composition lives in `CATALOGS[version].startingBag`.
- Changing constants or `startingBag` breaks deterministic replay for existing seeds. This is expected — note it in the commit message.

### Adding a new game version

- Add the version string to the `GameVersion` union in `types.ts`.
- Add a `CATALOGS` entry with `startingBag`, `shopPool`, `alwaysAvailable`, and `defaultAvailableModuleCount`.
- Update `CURRENT_GAME_VERSION` and `CURRENT_AVAILABLE_MODULE_COUNT` constants in `engine.ts`.
- The seed parser (`parseSeed`) already handles any version string present in `CATALOGS` — no parser changes needed.

### Debugging unexpected behavior

- Replay a run with `createInitialState(seed)` then `applyActions` (the helper in `engine.test.ts`) to reach any game state.
- Inspect `state.log` at each step — every mutation appends a human-readable log entry.
- Because `state.rngState` is deterministic, replay is bit-for-bit identical to production.
- Never add `console.log` to `engine.ts`. Write a focused test instead — it will survive refactors and serve as regression coverage.

### Writing engine tests

- Use `createInitialState(seed)` plus `applyActions` to drive the game to any state from a known seed.
- Use spread-override for synthetic states that skip to a specific condition: `{ ...createInitialState('seed'), roundStatus: 'stopped' }`.
- Prefer deterministic named seeds (e.g. `'baseline-seed'`, `'v1-three-slots'`) over derived or random values — tests become self-documenting.
- Test guards explicitly: confirm that invalid actions on the wrong `roundStatus` or `gameStatus` do not change state.

## Repo-Fit Guidance

- `engine.ts` public API: `reduceGameState`, `createInitialState`, `formatSeed`, `generateSeed`, `generateDailySeed`, `getModuleTemplate`. Keep this surface narrow — callers outside the engine should not need private helpers.
- All private handlers are tested indirectly through `reduceGameState`. Avoid exporting them.
- `WarpProtocolClient.tsx` must contain no game logic. It reads state and dispatches actions — nothing else.
- `page.tsx` handles URL param parsing and seed initialization only. Do not grow it.
- The seed format `game-{version}:mods-{count}:{payload}` is load-bearing. Never change the parsing regex in `parseSeed` without a backward-compatibility test covering old seed strings.
- State handlers must not mutate their input. Always return new objects via spread.

## Implementation Checklist

- Read `engine.ts` and `types.ts` fully before any change.
- Add the `CoreKind` union entry before the blueprint — TypeScript exhaustiveness catches missing entries at compile time.
- Match the field order in `MODULE_BLUEPRINTS` entries to existing entries.
- Set `effectDescription` on every module that has an `EFFECT_RESOLVERS` entry.
- Run `npm run lint` after TypeScript-facing changes (new types, new exports, changed interfaces).

## Verification

- Targeted: `npm run test -- engine.test.ts`
- Full suite: `npm run test`
- Lint: `npm run lint`
- If a test references a new `CoreKind` not yet handled in a helper like `createTestModule`, add the case before running tests or the test will throw at runtime.
