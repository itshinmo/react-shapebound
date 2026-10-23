---
description: Naming, imports, Tailwind, testing, comment, and accessibility conventions. Read before writing any code or CSS.
last-verified: 2026-10-23
---

# Conventions memory

The authoritative rules are in `AGENTS.md#non-negotiables`, `docs/architecture.md`, and
`docs/design-system.md`. Practical reminders:

## Naming and files

- Files and directories: `kebab-case`. Components/types: `PascalCase`. Hooks: `use-something.ts`.
- Tests sit beside the code: `rng.test.ts`, `settings-screen.test.tsx`.
- No barrel files. Import the concrete module.

## Imports

- Use the `@/` alias for cross-layer imports; use `./` within a feature or module.
- Import order is enforced by ESLint. Run `pnpm lint:fix` rather than hand-sorting.
- Type-only imports use `import type` (inline style is configured).

## React

- Function components; named exports. No default exports in `src/`.
- Keep state local until it genuinely crosses a feature boundary.
- The game domain is not a React concern. Do not import React in `src/game`.
- Effects own browser integration (timers, storage, DOM attributes); pure rules do not.
- Real-time gameplay keeps per-frame position in refs and writes transforms directly. The joystick
  knob is written on `pointermove` too. Do not mirror either in React state. Player bounds are the
  static container's inner box; the screen is not a collision boundary.

## Tailwind

- Style with utilities and semantic tokens from `src/styles/global.css`.
- No inline hex/rgb. No CSS Modules or CSS-in-JS. `@apply` only in the base layer.
- Use `cx()` from `src/shared/lib/cx.ts` for conditional classes.
- Keep class strings statically visible so Tailwind can scan them.
- Extract repeated visual patterns into `src/shared/ui` primitives, not `@apply` soup.
- Custom utilities are defined with `@utility` in `global.css`.
- Yellow fields use `bg-paper`, `text-ink-inverse`, `border-ink-inverse`, and `variant="inverse"`
  buttons. Black fields use `bg-void`, `text-ink`, acid/cyan borders.
- `font-hero` (Anton) is only for oversized display; `font-display` for UI headings/buttons;
  `font-body` for copy; `font-mono` for HUD labels.
- Use `SectionLabel` for `/// MODULE_LABEL` markers. Reference-derived art must remain original.
- Clipped surfaces use `clip-border` + `--clip-border`/`--clip-fill`, never `border-*` or `bg-*`; the
  inset `::before` layer is the only border that survives the diagonal. Presentation pages use the
  shared `SiteHeader` rendered once by `PresentationLayout`; `/play` is headerless and outside it.
- The play surface is landscape-only: black + faint grid, a static outline container, no header/HUD.
  Title and settings are responsive. Joystick circles are the functional exception to the
  clipped-surface rule.

## Tests

- Vitest + Testing Library. Query by role, label, or text first; test IDs are a last resort.
- Test behavior and domain invariants, not implementation details.
- New domain logic needs unit tests. New interaction needs a component test.
- Player rules and joystick vector math are unit-tested; the landscape gate and play screen have
  component tests. Device-only orientation/fullscreen behavior is manual and marked `[unverified]`.
- Never weaken an assertion to go green.

## Comments and docs

- No comments that narrate code. Only non-obvious constraints.
- Unknown facts become `[unverified]`; unfinished decisions become `<!-- TODO -->`.
- If behavior changes, update the canonical doc in the same change.

## Accessibility

- Semantic elements first; `button` for actions, `Link` for navigation.
- Every interactive element is keyboard reachable with visible focus.
- Respect `prefers-reduced-motion` and the in-app setting, except the reduce-motion switch's 150ms
  thumb feedback, which remains as the control's own state feedback.
- Maintain contrast; decorative effects must not obscure content.
