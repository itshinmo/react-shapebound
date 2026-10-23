---
description: Layer boundaries, routing, state/persistence shape, and deliberate constraints. Read before adding modules, changing state, or moving code.
last-verified: 2026-10-23
---

# Architecture memory

## Layers

```text
src/app       composition root: router, shell, presentation layout, error boundary, providers
src/features  screens and feature-owned state (title, play, settings, not-found; play owns the gate)
src/game      pure domain: RNG, save envelope, player rules
src/shared    cross-cutting primitives: UI, storage, config
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
```

Dependency direction: `app → features → game + shared`. `shared` imports nothing upward. `game`
imports no React, DOM, browser storage, timers, `Date.now`, or `Math.random`.

Enforced by `eslint.config.js` (`import-x/no-restricted-paths`, restricted imports/globals).

## Routing

- `BrowserRouter` + declarative `<Routes>` in `src/app/app.tsx`.
- Routes: `/` title, `/play` landscape movement board, `/settings`, `*` not-found.
- Clean URLs are deliberate (ADR-010). Static hosts need an `index.html` fallback; subpath hosting
  needs matching Vite `base` and router `basename`. `PresentationLayout` renders `SiteHeader` once
  and routes presentation pages through `<Outlet />`; `/play` is outside it and headerless.

## Settings

- `src/features/settings/` owns the context, provider, storage, and screen.
- `SettingsProvider` wraps the router in `src/app/app.tsx`.
- Settings schema v2 persists reduced motion and glow intensity (0–100). v1 records migrate on read
  with `glowIntensity: 100`.
- Reduced motion is mirrored to `document.documentElement.dataset.reducedMotion`; glow intensity is
  mirrored to the `--glow-intensity` custom property. Only play glow utilities and the static
  settings preview consume it; interface glows stay fixed.

## Game domain

- `src/game/rng.ts` — seeded mulberry32 `Rng`; all randomness goes through it.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, parse/serialize, schema versioning.
- `src/game/player.ts` — player stats/state, base stats, `PLAYER_CONTAINER_SIZE` (320, `[unverified]`),
  movement, container bounds, health/shield, damage order. `dtSeconds` is injected; no randomness.
- The play feature owns the rAF loop, input, bounds measurement, and DOM transform writes. There is
  no run save yet.
- Time, randomness, and persistence are inputs/ports; the domain never reaches for them.

## Landscape and input

- The play screen is landscape-only; title, settings, and not-found are responsive. `LandscapeGate`
  wraps only `PlayScreen` and replaces the play surface with a rotate overlay in portrait. See
  ADR-009.
- Touch `/play` shows a one-tap start overlay that requests fullscreen and attempts
  `screen.orientation.lock('landscape')`. Failure is non-blocking. iOS/Safari cannot lock; the gate is
  the fallback.
- Keyboard: WASD/arrows. Touch: pointer-driven joystick, touch/pen only, hidden on release. Player
  position and joystick knob are written via refs, not per-frame React state.
- A static, outline-only container (320 px `[unverified]`) is centered in the safe playfield. The
  player is clamped to its inner bounds; the screen is not a collision boundary. Container size is a
  future skill-tree upgrade. See ADR-009.
- The play surface is full-bleed black with a faint grid, no header, and no HUD. The scanline overlay
  is hidden on `/play`.

## Deliberate constraints — do not “fix”

- **No canvas/WebGL.** DOM-only is an accessibility and testability decision (ADR-002).
- **Clean URLs need a host fallback.** BrowserRouter is intentional; configure SPA history fallback
  (ADR-010).
- **No state library yet.** Reducer + context until measured need (ADR-003).
- **No runtime network.** Offline is a product requirement (ADR-001).
- **No CSS Modules.** Tailwind + theme tokens is the styling system (ADR-005).
- **Landscape-only play surface.** No portrait play layout, header, or HUD without a design pass
  (ADR-009). Presentation pages stay responsive. The player is bounded by the container, not the
  screen.

See `docs/decisions-not-to-fix.md` for the maintained list.
