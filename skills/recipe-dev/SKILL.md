---
name: recipe-dev
description: Add new recipes, modify the recipe schema, change the loader or validator, or work on the recipes page UI. Use when asked to add a recipe to data/recipes/, update the Recipe type in app/recipes/types.ts, change isValidRecipe in lib/recipes.ts, or modify the filtering, display, or modal in app/recipes/page.tsx.
---

# Recipe Dev

## Overview

Recipes live as individual JSON files in `data/recipes/`. The loader (`lib/recipes.ts`) reads and validates every file at request time; the API route (`app/api/recipes/route.ts`) serves them all without filtering; the client page (`app/recipes/page.tsx`) handles search, tag filtering, and display. Changes to the data shape must stay in sync across four places: the JSON files in `data/recipes/`, the `Recipe` interface in `app/recipes/types.ts`, the `isValidRecipe` validator in `lib/recipes.ts`, and the test in `test/recipes-json.test.ts`.

## Workflow

1. Identify the task: new recipe file, schema change, loader or validator change, or UI change on the recipes page.
2. For schema changes, read `app/recipes/types.ts` and `lib/recipes.ts` before editing anything.
3. Make the change — JSON file, type update, and validator update — as one coherent unit.
4. Run `npm run test` to catch schema mismatches immediately; the test loads every recipe file in `data/recipes/`.
5. Run `npm run lint` if TypeScript-facing files changed.

## Decision Rules

### Adding a new recipe

- Create a JSON file in `data/recipes/` using lowercase dot-separated words matching the existing convention — for example, `chicken.tikka.masala.json`.
- Required fields: `title` (string), `description` (string), `prepTime` (string), `cookTime` (string), `servings` (number), `difficulty` ("Easy" | "Medium" | "Hard"), `tags` (string[]), `ingredients` (string[]), `instructions` (string[]), `macros` (`{ calories, protein, carbs, fat }` — all numbers, per serving).
- Optional field: `notes` (string).
- Reuse existing tags wherever they apply — `data/recipes/README.md` lists the common tag vocabulary. Add new tags to the README when you introduce them.
- Validation runs automatically on load via `isValidRecipe`; a bad schema throws and surfaces at test and build time.

### Changing the Recipe schema

- Edit the `Recipe` interface in `app/recipes/types.ts` first.
- Update `isValidRecipe` in `lib/recipes.ts` to match — every field in the interface needs a corresponding runtime type check.
- Update `test/recipes-json.test.ts` if the new field should be asserted for every recipe.
- Update all existing JSON files in `data/recipes/` if the new field is required; adding an optional field does not require touching existing files.
- Optional fields must be typed as `field?: Type` in the interface and checked with `(recipe.field === undefined || typeof recipe.field === '...')` in the validator.

### Changing the loader or API

- `loadRecipesFromDirectory` in `lib/recipes.ts` is a pure function — reads files synchronously, validates each one, throws on any invalid schema.
- `app/api/recipes/route.ts` is a thin wrapper that calls the loader and returns all recipes as JSON. Do not add filtering, sorting, or business logic here; all of that belongs in the client.

### Working on the recipes page UI

- `app/recipes/page.tsx` is a client component (`'use client'`) — all filtering and state live here.
- The `filteredRecipes` `useMemo` searches `title`, `description`, and `tags`; extend it there if new filter axes are needed.
- Direct recipe linking uses the `?recipe=<slug>` URL param; slugs are produced by `generateRecipeSlug` (lowercase, non-alphanumeric replaced with hyphens).
- The Screen Wake Lock feature (`useWakeLock`) prevents sleep while a recipe is open — leave it alone unless explicitly changing sleep-lock behavior.

## Repo-Fit Guidance

- JSON files are the source of truth. Never hardcode recipe data in TypeScript.
- `isValidRecipe` is the schema gate; if it rejects a file, `loadRecipesFromDirectory` throws, surfacing the error at test and build time before anything reaches production.
- `test/recipes-json.test.ts` loads all real files on every test run — it catches mistakes in existing files as well as new ones.
- `data/recipes/README.md` documents the intended file structure and tag vocabulary. Keep it updated when introducing new tags or schema fields.

## Implementation Checklist

- Match the filename convention: lowercase dot-separated words (e.g. `greek.chicken.souvlaki.json`).
- All macro values must be numbers, never strings.
- `difficulty` must be exactly `"Easy"`, `"Medium"`, or `"Hard"` with a capital first letter.
- Time strings should follow the `"X minutes"` or `"X hours"` format used in existing recipes.
- Run `npm run test` after adding or editing any JSON file in `data/recipes/`.

## Verification

- Full suite (catches all JSON schema issues): `npm run test`
- Targeted (recipes only): `npm run test -- recipes-json`
- Lint (after TypeScript changes): `npm run lint`
