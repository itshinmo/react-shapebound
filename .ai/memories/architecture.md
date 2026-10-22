---
description: Layer boundaries, routing, state/persistence shape, and deliberate constraints. Read before adding modules, changing state, or moving code.
last-verified: 2026-10-21
---

# Architecture memory

## Layers

```text
src/app       composition root: router, shell, error boundary, providers
src/features  screens and feature-owned state (title, play, settings, not-found)
src/game      pure domain: RNG, save envelope, future rules
src/shared    cross-cutting primitives: UI, storage, config
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
```

Dependency direction: `app → features → game + shared`. `shared` imports nothing upward. `game`
imports no React, DOM, browser storage, timers, `Date.now`, or `Math.random`.

Enforced by `eslint.config.js` (`import-x/no-restricted-paths`, restricted imports/globals).

## Routing

- `HashRouter` + declarative `<Routes>` in `src/app/app.tsx`.
- Routes: `/` title, `/play` scaffold, `/settings`, `*` not-found.
- Hash routing is deliberate for static/offline hosting. Do not switch to `BrowserRouter` without
  an ADR and host fallback config.

## Settings

- `src/features/settings/` owns the context, provider, storage, and screen.
- `SettingsProvider` wraps the router in `src/app/app.tsx`.
- Reduced motion is persisted and mirrored to `document.documentElement.dataset.reducedMotion`.

## Game domain

- `src/game/rng.ts` — seeded mulberry32 `Rng`; all randomness goes through it.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, parse/serialize, schema versioning.
- No game state or reducer exists yet. Define it only after the rules spec is approved.
- Time, randomness, and persistence are inputs/ports; the domain never reaches for them.

## Deliberate constraints — do not “fix”

- **No canvas/WebGL.** DOM-only is an accessibility and testability decision (ADR-002).
- **Hash URLs are intentional.** They avoid server rewrite requirements (ADR-001).
- **No state library yet.** Reducer + context until measured need (ADR-003).
- **No runtime network.** Offline is a product requirement (ADR-001).
- **No CSS Modules.** Tailwind + theme tokens is the styling system (ADR-005).

See `docs/decisions-not-to-fix.md` for the maintained list.
