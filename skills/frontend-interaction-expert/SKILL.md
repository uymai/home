---
name: frontend-interaction-expert
description: Design, critique, and implement frontend interaction patterns for web applications with emphasis on usability, state transitions, accessibility, responsiveness, and UX writing. Use when Codex is asked to improve or build interactions such as forms, menus, modals, drawers, onboarding flows, search/filter controls, empty states, loading/error/success feedback, keyboard and focus behavior, or other user-facing frontend behavior where the quality of the interaction matters as much as the code.
---

# Frontend Interaction Expert

## Overview

Use this skill to approach frontend work from the interaction layer first: user intent, component behavior, state coverage, and accessibility before implementation details. Keep the result aligned with the existing product language and design system instead of introducing generic patterns.

## Workflow

1. Inspect the existing screen, surrounding components, and design tokens before changing behavior.
2. Identify the user goal, the trigger, the system response, and the completion or recovery path.
3. Define the interaction states before coding: idle, hover, focus, active, pending, success, error, empty, disabled, and reduced-motion variants when relevant.
4. Choose the lightest interaction pattern that fits the task and preserves user context.
5. Implement the behavior using the repo's established visual language, spacing, motion, and component APIs.
6. Verify keyboard access, focus order, screen-reader labeling, mobile/touch behavior, and failure states.

## Choose The Interaction Pattern

- Prefer inline editing when the task is small and local to existing content.
- Prefer a popover or menu for lightweight, contextual choices that do not need lengthy explanation.
- Prefer a drawer or sheet when the user should retain page context while working through a multi-field task.
- Prefer a modal only when the action is blocking, destructive, legally important, or requires full attention.
- Prefer progressive disclosure over showing every control at once when the advanced options are secondary.

## Cover The States

- Show the system status quickly after every user action.
- Make loading states informative when latency is noticeable; do not leave interactive controls looking broken.
- Make empty states actionable by explaining what happened and what the user can do next.
- Make error states specific, recoverable, and close to the failed action.
- Keep success feedback proportional; prefer inline confirmation over celebratory noise for routine tasks.

## Keep Accessibility First-Class

- Ensure every interactive element is reachable and understandable via keyboard alone.
- Preserve visible focus styles and manage focus intentionally after opening, closing, submitting, or failing.
- Use semantic controls before building custom widgets.
- Respect reduced-motion preferences and avoid motion that carries essential meaning by itself.
- Keep touch targets and spacing large enough for mobile interaction.

## Write Better UX Copy

- Use verbs that describe the immediate action.
- Match labels, helper text, validation text, and confirmation text to the same mental model.
- Replace vague errors like "Something went wrong" when the system can name the problem and next step.
- Remove decorative copy that competes with task completion.

## Fit The Existing Product

- Reuse existing components and interaction patterns before inventing a new one.
- Match the product's tone, density, and animation level.
- Keep implementation choices subordinate to the user flow; a technically elegant component is still wrong if the interaction is confusing.

## Use Reference Material Selectively

- Read [references/interaction-patterns.md](references/interaction-patterns.md) when the task involves detailed decisions about forms, async feedback, navigation/disclosure, touch behavior, motion, or microcopy.
- Keep SKILL.md for the operating rules and use the reference file only when the task needs deeper heuristics.
