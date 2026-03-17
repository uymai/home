---
name: react-fullstack-dev
description: Build, modify, debug, and review React fullstack applications with emphasis on Next.js App Router, TypeScript, server/client component boundaries, API route handlers, data flows, tests, and styling. Use when Codex is asked to change React pages or components, add routes or route handlers, wire frontend to backend logic, fix UI or hydration bugs, improve developer experience, or implement features in a React or Next.js codebase.
---

# React Fullstack Dev

## Overview

Use this skill to work like a pragmatic senior React engineer: inspect existing patterns first, make targeted changes, respect server/client boundaries, and verify behavior with the repo's existing test and lint commands.

## Workflow

1. Inspect `package.json`, the relevant route or component files, and any nearby tests before proposing or making changes.
2. Determine whether the work belongs in a server component, client component, shared utility, or route handler.
3. Preserve the existing project structure unless the current structure is clearly harming maintainability.
4. Make the smallest coherent change that solves the request end to end.
5. Run the narrowest meaningful verification first, then broader project checks when warranted.

## Decision Rules

### Choose component boundaries carefully

- Prefer server components by default in Next.js App Router.
- Add `'use client'` only when state, effects, event handlers, browser APIs, or client-only libraries are actually needed.
- Keep client islands small. Push data loading and non-interactive rendering up to server components when possible.

### Place code by responsibility

- Put route UI in `app/**/page.tsx`.
- Put layouts and metadata in `app/**/layout.tsx` when they affect a route segment.
- Put API endpoints in `app/api/**/route.ts`.
- Keep reusable presentational pieces in nearby component files or the repo's existing shared component location.
- Extract pure logic into utilities or typed modules when it improves testability.

### Work fullstack, not just frontend

- When UI changes depend on data, inspect the source of truth and the route handler or loader path before editing component code.
- Keep request/response shapes explicit and aligned across UI, route handlers, and helpers.
- Preserve useful error states and loading states instead of only implementing the happy path.
- Prefer typed interfaces for payloads, props, and state transitions.

## Repo-Fit Guidance

For a repo shaped like this one:

- Expect Next.js App Router under `app/`.
- Expect TypeScript React components in `.tsx` files.
- Expect route handlers under `app/api/`.
- Expect styling through Tailwind and global CSS, with design choices already reflected in `app/globals.css`.
- Expect tests to run through `vitest` and project scripts from `package.json`.

When working on a homepage or marketing site in this repo:

- Reuse existing layout patterns before introducing a new page architecture.
- Keep copy, links, and card data easy to edit.
- Prefer small composable sections over one oversized page component.
- Preserve metadata quality in `layout.tsx` or route-level metadata exports when page intent changes.

## Implementation Checklist

- Read neighboring files before introducing new abstractions.
- Match the existing import style, quote style, and file organization.
- Avoid speculative refactors unless they are required for the requested change.
- Add or update tests when behavior changes in logic-heavy code.
- Keep accessibility in scope for interactive controls, headings, and links.
- Call out tradeoffs when the request implies SEO, hydration, caching, or API design consequences.

## Verification

- Use targeted tests first, such as `npm run test -- <file>` when available through the project's tooling.
- Run `npm run test` for logic or behavior changes covered by Vitest.
- Run `npm run lint` when structural JSX, Next.js, or TypeScript-facing changes may surface lint issues.
- If a command cannot run, explain why and state the residual risk clearly.
