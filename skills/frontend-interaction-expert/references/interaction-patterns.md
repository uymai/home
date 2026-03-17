# Interaction Patterns Reference

## Table Of Contents

- Forms and validation
- Async actions and feedback
- Navigation and disclosure
- Mobile and touch behavior
- Motion and perceived performance
- Microcopy

## Forms And Validation

- Reveal the minimum number of fields needed to move the user forward.
- Group related fields under a clear subheading when the form is longer than a few controls.
- Validate format constraints as early as possible when they prevent submission.
- Delay disruptive validation until the user has interacted with the field.
- Keep validation text adjacent to the field and state the fix directly.
- Preserve entered values after recoverable failures.
- Disable submit only when the next action is truly impossible; otherwise allow submission and show precise errors.

## Async Actions And Feedback

- Distinguish between initial loading, background refresh, and pending submission.
- Use skeletons when layout is known and a spinner alone would hide structure.
- Keep the trigger visible during pending states unless duplicate submission is dangerous.
- Swap button labels like `Save` to `Saving...` only when the action remains understandable and the width shift is controlled.
- Show inline errors near the affected area first; escalate to banners only for broader system failures.
- Use optimistic UI only when rollback is credible and understandable.

## Navigation And Disclosure

- Use tabs for sibling views, not for step-by-step flows.
- Use accordions for optional detail, not for critical content that every user must inspect.
- Use drawers when users benefit from retaining page context behind the task.
- Use modals sparingly; they interrupt orientation and often complicate mobile and keyboard behavior.
- When opening layered UI, set focus to the first meaningful element and restore focus to the trigger when closing.

## Mobile And Touch Behavior

- Assume imprecise input. Increase hit areas before increasing visual complexity.
- Keep primary actions anchored predictably, especially near the bottom of mobile flows when appropriate.
- Avoid hover-only disclosures; provide tap-safe alternatives.
- Reduce text entry when a picker, segmented control, or autofill-capable field would work better.
- Test overflow, sticky actions, and virtual keyboard interactions on constrained viewports.

## Motion And Perceived Performance

- Use motion to clarify cause and effect, not to decorate.
- Keep durations short and consistent across similar interactions.
- Animate opacity, transform, and layout changes carefully; avoid jarring position jumps during async updates.
- Respect `prefers-reduced-motion` by shortening or removing non-essential transitions.
- When data is slow, prioritize stable layout and clear progress over elaborate loading animation.

## Microcopy

- Name actions by outcome: `Create project`, `Send invite`, `Retry payment`.
- Make destructive actions explicit.
- Use helper text to answer likely hesitation before it becomes an error.
- Keep empty-state copy focused on what the user can do next.
- Make status text specific enough that support can understand the failure without reverse engineering the UI.
