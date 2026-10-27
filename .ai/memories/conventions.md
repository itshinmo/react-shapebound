---
description: Naming, imports, Tailwind, testing, comment, and accessibility conventions. Read before writing any code or CSS.
last-verified: 2026-10-27
---

# Conventions memory

The authoritative rules are in `AGENTS.md#non-negotiables`, `docs/architecture.md`, and
`docs/design-system.md`. Practical reminders:

## Naming and files

- Files and directories: `kebab-case`. Components/types: `PascalCase`. Hooks: `use-something.ts`.
- Tests sit beside the code: `rng.test.ts`, `run-hud.test.tsx`.
- No barrel files. Import the concrete module.

## Imports

- Use the `@/` alias for cross-layer imports; use `./` within a feature or module.
- Import order is enforced by ESLint. Run `pnpm lint:fix` rather than hand-sorting.
- Type-only imports use `import type` (inline style is configured).

## React and the run loop

- Function components; named exports. No default exports in `src/`.
- Keep state local until it genuinely crosses a feature boundary.
- The game domain is not a React concern. Do not import React in `src/game`.
- Effects own browser integration (timers, storage, DOM attributes, rAF, listeners); pure rules do
  not.
- Real-time gameplay keeps per-frame values in refs and writes transforms directly. The player,
  joystick knob, HUD timer/points/track, and enemy pool are written imperatively at most once per
  frame. Do not mirror them in React state.
- React state is coarse: run status, freeze-set changes, banner presence, commit status, overlay
  visibility, and timeline membership/state.
- The run loop owns a 50 ms frame clamp, a retained sub-millisecond remainder, a 20 ms enemy
  accumulator (max 3 steps/frame), and the freeze-set gate. It calls pure domain functions; never
  duplicate the rules in the feature.
- The play surface stays mounted in portrait. The gate is an overlay; the run is not respawned.
- Player bounds are the static container's inner box; the screen is not a collision boundary. Enemy
  collision is in viewport space via the projected player hurtbox.

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
- Semantic run colors: `survival` is blue-point currency only; `boss-purple`, `boss-green`, and
  `boss-orange` are boss identity only; `orange` is the triangle threat; `track` is the timeline
  line only.
- Glow intensity is in-run scope: play field, enemies, warning lane/beam, timeline, boss banner,
  pause connector, and run-over, plus the static `GlowPreview`. Presentation pages, HUD text/legend/
  scrim, menu button, pause frame/buttons, and focus rings stay fixed or unglowed. `shadow-glow-track`
  is rejected. Use `glow-track`, `glow-hud`, and `glow-danger` only on decorative wrappers, never
  focusable controls.
- The play surface is landscape-only: black + faint grid, a static outline container, no header, and
  a HUD overlay with no reserved band. Title, settings, skills, and not-found are responsive. Joystick circles
  are the functional exception to the clipped-surface rule.

## Tests

- Vitest + Testing Library. Query by role, label, or text first; test IDs are a last resort.
- Test behavior and domain invariants, not implementation details.
- New domain logic needs unit tests. New interaction needs a component test.
- Player, run, timeline, progression, save, RNG, and enemy rules are unit-tested. HUD, enemy layer,
  pause, run-over, skills, landscape gate, and play screen have component tests. Device-only
  orientation/fullscreen behavior is manual and marked `[unverified]`.
- Never weaken an assertion to go green.

## Comments and docs

- No comments that narrate code. Only non-obvious constraints.
- Unknown facts become `[unverified]`; unfinished decisions become `<!-- TODO -->`.
- If behavior changes, update the canonical doc in the same change.

## Accessibility

- Semantic elements first; `button` for actions, `Link` for navigation.
- Every interactive element is keyboard reachable with visible focus.
- The run timer is not a live region; the boss banner announces once; the hidden timeline list
  updates only on membership/state changes. Modals trap and return focus.
- Respect `prefers-reduced-motion` and the in-app setting, except the reduce-motion switch's 150ms
  thumb feedback, which remains as the control's own state feedback. Essential gameplay/clock motion
  (player, enemies, timer, timeline) remains.
- Maintain contrast; decorative effects must not obscure content. Color is never the only signal.
