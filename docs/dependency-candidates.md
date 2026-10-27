# Dependency candidates

> **Status:** living decision aid, not approval to install. Last reviewed 2026-10-27.
> This page records packages that may become useful, why they are or are not appropriate now, and
> the evidence to collect before proposing one. It is not an ADR and it does not authorize an install.

## How to use this page

When a task would be easier with a package:

1. **Try the platform first.** Check whether CSS, the Web Animations API, native dialogs, the
   Popover API, View Transitions, or the existing React/domain code solves the problem.
2. **Check what is already installed** in `package.json` and whether an existing dependency covers
   the need.
3. **Check this list** for a candidate and its trigger. A candidate being listed here is not
   permission to install it.
4. **Stop and notify the author before installing anything.** Use the template below. Do not edit
   `package.json`, `pnpm-lock.yaml`, build config, CI, or a license index while waiting for a
   decision.
5. **If approved:**
   - a runtime dependency needs an ADR and must respect the offline, DOM-only, accessibility, and
     layer constraints;
   - a dev dependency needs a short explanation and should be added separately from unrelated
     behavior;
   - measure the bundle/perf cost, add tests/CI coverage where appropriate, and update this page,
     the stack/version docs, and the license index.
6. **If no candidate fits**, propose a new one using the same evidence. Add it to this page only
   after the author decides.

## Notification template

Use this in the conversation when a candidate would help. Keep it short but concrete.

```text
DEPENDENCY CHECK — <task or feature>
Problem:
Candidate:
Current alternative:
Runtime or dev:
Estimated cost / impact:
Evidence:
Recommendation:
Decision needed:
```

`Evidence` should include the package version checked, bundle or runtime impact if known, and what
was measured rather than assumed. `Decision needed` should be a clear yes/no or a named trade-off.

## Current baseline

As of **2026-10-27**:

- Runtime dependencies: React 19.3.1, React DOM 19.3.1, React Router 8.5.0, and four Fontsource
  asset packages. There is no Motion, state, UI-kit, or data-fetching runtime.
- Production build: approximately **110 KB gzip JavaScript** and **11 KB gzip CSS**, plus locally
  bundled fonts.
- Tests: **384 tests in 28 files**; no E2E browser suite yet.
- Constraints: no runtime network calls, no canvas/WebGL, no service worker/PWA, a pure
  `src/game` domain, and no new runtime dependency without an ADR.
- Dev dependencies are not part of the runtime bundle but still add install, CI, and maintenance
  cost.

Re-check versions and remeasure the actual tree-shaken output before making a decision. Package
pages and bundle tools report package-level numbers, not this app's final chunk sizes.

## Decision principles

- **Platform before package.** Prefer CSS transitions/keyframes, `@starting-style`,
  `transition-behavior: allow-discrete`, the Web Animations API, native dialogs/popovers, Web Audio,
  and View Transitions where the support and accessibility are acceptable.
- **No second timing model in the game.** Player, enemies, timer, timeline, and HUD stay on the
  existing `requestAnimationFrame`/ref architecture. A React animation library must not drive those
  surfaces.
- **Runtime cost is a product cost.** Measure gzip size, parse/execute cost, effects on interaction
  latency, and maintenance surface. A package that saves a few lines is not automatically a win.
- **Accessibility is a gate.** Packages must preserve keyboard access, focus management, contrast,
  and both system and in-app reduced-motion behavior.
- **Offline and DOM-only are non-negotiable.** No package that requires runtime network access, a
  canvas renderer, or a server is eligible.
- **One animation language.** If an animation library is added, define its boundary and avoid
  mixing competing motion systems across the same surface.
- **No dependency by fashion.** Every addition needs a concrete problem, a current alternative, and
  a measurable reason.

## Candidate list

### Recommended next — dev tooling

These are proposals, not installed dependencies. They improve confidence in the current visual and
performance work without adding runtime payload.

| Candidate                  | Kind | Status                                        | Use when                                                                                               | Notes                                                                                                                           |
| -------------------------- | ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `@playwright/test`         | dev  | Recommended next; needs author go-ahead       | Browser E2E, visual snapshots, focus/modal behavior, reduced motion, portrait/landscape, glow at 0/100 | Current 1.64.1. Adds browser binaries and CI time. Start with a small critical-flow suite rather than exhaustive page coverage. |
| `@axe-core/playwright`     | dev  | Pair with Playwright                          | Automated accessibility scans                                                                          | Current 4.14.0. Complements `eslint-plugin-jsx-a11y`; does not replace manual keyboard checks.                                  |
| `rollup-plugin-visualizer` | dev  | Recommended for the next bundle change        | Inspect what is in the production build before adding a runtime package                                | Current 7.1.1. Produces an analysis artifact; no runtime effect.                                                                |
| `size-limit`               | dev  | Recommended after a baseline budget is agreed | Enforce gzip budgets for JS/CSS and prevent dependency drift                                           | Current 14.3.0. Configure against the actual build output; do not set an arbitrary limit that disables legitimate work.         |

### Deferred runtime candidates

Do not install these without an ADR. A listed trigger is a prompt to reconsider, not an automatic
approval.

| Candidate                                   | Kind    | Status                      | Trigger                                                                                                                                     | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motion` (formerly Framer Motion)           | runtime | **Defer**                   | Complex React UI orchestration: shared-layout transitions, gesture-driven panels, exit choreography, or a much richer interactive node tree | Strong API, but a second animation/timing model. Motion 14.7.0: package-level full export ~58.5 KB gzip; the `motion` component is roughly 43 KB minimum; `m` + `LazyMotion` is ~24 KB with `domAnimation` and ~38 KB with `domMax`; `useAnimate` mini is ~3.3 KB (WAAPI only), hybrid ~23 KB. Current JS is ~110 KB gzip. Do not use it for the game loop. If adopted: ADR, presentation/overlay only, `m`/`LazyMotion` or the smallest API, measure actual chunks, preserve reduced motion. |
| `@floating-ui/react`                        | runtime | Defer                       | Interactive node-tree tooltips/popovers need collision detection, flip, or anchoring beyond native CSS                                      | Native Popover API and CSS anchor positioning may be enough. Revisit only when nodes become interactive.                                                                                                                                                                                                                                                                                                                                                                                      |
| Valibot or Zod                              | runtime | Defer                       | Save/progression schemas grow beyond the current four-field v1 guard, or multiple schemas need shared validation                            | The hand-written v1 guard is sufficient and keeps `src/game` dependency-free. A schema library needs an ADR and a migration plan.                                                                                                                                                                                                                                                                                                                                                             |
| Howler                                      | runtime | Defer                       | Audio needs sprites, looping, mixing, and cross-browser management that native Web Audio cannot cover cleanly                               | There is no audio yet. Prefer a small native Web Audio adapter first.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@radix-ui/react-*` or Headless UI          | runtime | Defer                       | A real accessible component surface appears that native elements and the current primitives cannot cover                                    | Native `<dialog>`, buttons, and links cover the current UI. A component kit needs a concrete accessibility gap.                                                                                                                                                                                                                                                                                                                                                                               |
| Zustand, Redux, Jotai, XState               | runtime | Defer / not recommended now | Measured cross-feature state complexity                                                                                                     | ADR-003 deliberately favors pure reducers/feature state. Do not add a store to be “ready”.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tailwind-merge`, CVA, or tailwind-variants | runtime | Defer                       | Variant composition becomes significantly more complex                                                                                      | The current `cx()` and primitive variants are deliberate; automatic class merging can hide conflicts.                                                                                                                                                                                                                                                                                                                                                                                         |
| GSAP or anime.js                            | runtime | Not recommended now         | Large, timeline-heavy choreography across independent elements                                                                              | Overlaps CSS/WAAPI; adds runtime and a second motion model. Require a measured comparison before considering.                                                                                                                                                                                                                                                                                                                                                                                 |
| Lottie or Rive                              | runtime | Avoid                       | Vector/character animation                                                                                                                  | These add a canvas/SVG animation runtime that conflicts with the DOM-only direction, bundle budget, and inspectability. Use CSS/SVG instead.                                                                                                                                                                                                                                                                                                                                                  |

### Optional later — dev tooling

| Candidate                   | Kind | Status   | Trigger                                                                                            | Notes                                                                                 |
| --------------------------- | ---- | -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Lighthouse CI (`@lhci/cli`) | dev  | Defer    | Playwright/axe and bundle budgets are stable, and lab performance budgets are needed in CI         | Another CI surface; not a first step.                                                 |
| `fast-check`                | dev  | Optional | Pure-domain invariants (collision geometry, timeline bounds, save arithmetic) need generated cases | Property tests complement, not replace, example-based tests.                          |
| `@vitest/browser`           | dev  | Defer    | Component behavior needs a real browser before full E2E exists                                     | Playwright E2E covers the app-level gaps; avoid running two browser suites initially. |

## Motion-specific recommendation

Motion is the strongest general-purpose candidate if the UI later needs complex React
orchestration. It is not the right default for this build:

- The current animations are CSS keyframes/transitions and the game loop is imperative; a Motion
  adoption would create a second animation architecture.
- The simple missing effects (pause entrance/rail motion, run-over entrance, boss banner animation)
  should be built with CSS/WAAPI/View Transitions first.
- The full React `motion` component is too costly relative to the current 110 KB gzip JavaScript.
- If a real trigger appears, run a small spike comparing CSS/WAAPI with `m` + `LazyMotion` or
  `useAnimate` mini, and measure the actual bundle and interaction cost before writing an ADR.

## Related records

- [`AGENTS.md`](../AGENTS.md) — approval gate and dependency rules.
- [`docs/architecture.md`](architecture.md) — layers, rendering constraints, and quality gates.
- [`docs/runbook.md`](runbook.md#dependency-policy) — operational dependency policy.
- [`decisions/ADR-001-vite-react-spa.md`](../decisions/ADR-001-vite-react-spa.md) — offline SPA.
- [`decisions/ADR-002-dom-only-rendering.md`](../decisions/ADR-002-dom-only-rendering.md) — no
  canvas/WebGL.
- [`decisions/ADR-003-pure-game-domain.md`](../decisions/ADR-003-pure-game-domain.md) — no state
  library and pure domain.
