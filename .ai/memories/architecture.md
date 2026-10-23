---
description: Layer boundaries, routing, state/persistence shape, and deliberate constraints. Read before adding modules, changing state, or moving code.
last-verified: 2026-10-23
---

# Architecture memory

## Layers

```text
src/app       composition root: router, shell, error boundary, providers
src/features  screens and feature-owned state (title, play, settings, not-found; play owns the gate)
src/game      pure domain: RNG, save envelope, player rules
src/shared    cross-cutting primitives: UI, storage, config
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
```

Dependency direction: `app → features → game + shared`. `shared` imports nothing upward. `game`
imports no React, DOM, browser storage, timers, `Date.now`, or `Math.random`.

Enforced by `eslint.config.js` (`import-x/no-restricted-paths`, restricted imports/globals).

## Routing

- `HashRouter` + declarative `<Routes>` in `src/app/app.tsx`.
- Routes: `/` title, `/play` landscape movement board, `/settings`, `*` not-found.
- Hash routing is deliberate for static/offline hosting. Do not switch to `BrowserRouter` without
  an ADR and host fallback config.

## Settings

- `src/features/settings/` owns the context, provider, storage, and screen.
- `SettingsProvider` wraps the router in `src/app/app.tsx`.
- Reduced motion is persisted and mirrored to `document.documentElement.dataset.reducedMotion`.

## Game domain

- `src/game/rng.ts` — seeded mulberry32 `Rng`; all randomness goes through it.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, parse/serialize, schema versioning.
- `src/game/player.ts` — player stats/state, base stats, movement, bounds, health/shield, damage
  order. `dtSeconds` is injected; no randomness.
- The play feature owns the rAF loop, input, bounds measurement, and DOM transform writes. There is
  no run save yet.
- Time, randomness, and persistence are inputs/ports; the domain never reaches for them.

## Landscape and input

- The play screen is landscape-only; title, settings, and not-found are responsive. `LandscapeGate`
  wraps only `PlayScreen` and replaces the play surface with a rotate overlay in portrait. See
  ADR-008.
- Touch `/play` shows a one-tap start overlay that requests fullscreen and attempts
  `screen.orientation.lock('landscape')`. Failure is non-blocking. iOS/Safari cannot lock; the gate is
  the fallback.
- Keyboard: WASD/arrows. Touch: pointer-driven joystick, touch/pen only, hidden on release. Player
  position and joystick knob are written via refs, not per-frame React state. Player bounds intersect
  the safe playfield with `window.visualViewport`.
- The play surface is full-bleed black with a faint grid, no header, and no HUD. The scanline overlay
  is hidden on `/play`.

## Deliberate constraints — do not “fix”

- **No canvas/WebGL.** DOM-only is an accessibility and testability decision (ADR-002).
- **Hash URLs are intentional.** They avoid server rewrite requirements (ADR-001).
- **No state library yet.** Reducer + context until measured need (ADR-003).
- **No runtime network.** Offline is a product requirement (ADR-001).
- **No CSS Modules.** Tailwind + theme tokens is the styling system (ADR-005).
- **Landscape-only play surface.** No portrait play layout, header, or HUD without a design pass
  (ADR-008). Presentation pages stay responsive.

See `docs/decisions-not-to-fix.md` for the maintained list.
