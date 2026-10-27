---
description: Layer boundaries, routing, state/persistence shape, run lifecycle, and deliberate constraints. Read before adding modules, changing state, or moving code.
last-verified: 2026-10-27
---

# Architecture memory

## Layers

```text
src/app       composition root: router, shell, presentation layout, error boundary, providers
src/features  screens and feature-owned state (title, play, settings, skills, not-found; play owns the run loop and gate)
src/game      pure domain: RNG, save envelope, player, run, timeline, progression, enemy rules
src/shared    cross-cutting primitives: UI, storage, config
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
```

Dependency direction: `app → features → game + shared`. `shared` imports nothing upward. `game`
imports no React, DOM, browser storage, timers, `Date.now`, or `Math.random`.

Enforced by `eslint.config.js` (`import-x/no-restricted-paths`, restricted imports/globals).

## Routing

- `BrowserRouter` + declarative `<Routes>` in `src/app/app.tsx`.
- Routes: `/` title, `/play` landscape survival run, `/settings`, `/skills`, `*` not-found.
- Clean URLs are deliberate (ADR-010). The router `basename` comes from `import.meta.env.BASE_URL`;
  Vite `base` is `/` locally and `/react-shapebound/` in the deploy build. A static host needs an
  `index.html` fallback; GitHub Pages uses a `404.html` copy, so deep links boot with HTTP 404
  (ADR-016). GitHub Pages deploys the artifact built by `.github/workflows/deploy.yml`, which also
  refreshes a `gh-pages` snapshot. `PresentationLayout` renders `SiteHeader` once and routes
  presentation pages through `<Outlet />`; `/play` is outside it and headerless.
- `/settings` and `/skills` use the dark route field; the title stays yellow.
- `/skills` is a read-only presentation page. It reads the save through
  `src/features/play/progression-storage.ts` and never writes, spends, or unlocks anything; the map is
  a locked generic 3 × 3 preview.

## Settings and save

- `src/features/settings/` owns the context, provider, storage, and screen.
- `SettingsProvider` wraps the router in `src/app/app.tsx`.
- Settings schema v2 persists reduced motion and glow intensity (0–100). v1 records migrate on read
  with `glowIntensity: 100`.
- Reduced motion is mirrored to `document.documentElement.dataset.reducedMotion`; glow intensity is
  mirrored to the `--glow-intensity` custom property. Every in-run surface and the shared static
  `GlowPreview` consume it; presentation pages keep fixed glows (ADR-015).
- `shapebound:save` is the v1 progression record: `bluePoints`, `bestTimeMs`, `runCount`, and
  `bossCurrencies` (`purple`, `green`, `orange`). All fields are required. `none` = zero base;
  `valid` = stored; `unreadable` = terminal, blocks overwrite; `unavailable` = terminal, no write.
  A failed write retries the same latched envelope. Commit once at death (ADR-011).
- `/settings` reset removes both keys and rewrites settings defaults. The pause config writes
  settings only.
- There is no active-run save. Reload, back, route change, Restart, and Retry discard the run; the
  seed, clock, points, enemy world, and commit latch are in memory only.

## Game domain

- `src/game/rng.ts` — seeded mulberry32 `Rng`; all randomness goes through it.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, parse/serialize, schema versioning.
- `src/game/player.ts` — player stats/state, `PLAYER_CONTAINER_SIZE` (320, `[unverified]`), movement,
  container bounds, health/shield, damage order.
- `src/game/run.ts` — active-time run, points at 1/sec, `mm:ss:cc`, 300 000 ms boss markers,
  stacked freeze set (`pause`, `hidden`, `portrait`, `focus`), death, and commit status.
- `src/game/timeline.ts` — 320 px / 600 000 ms window, 160 px playhead, start and five-minute boss
  nodes, past/current/future.
- `src/game/progression.ts` — payload validation and commit arithmetic; no boss currency is awarded
  or spent.
- `src/game/enemy-*` — viewport-space world, 20 ms fixed step, 24-slot pool, caps/skip policy,
  collision/damage, red square and orange triangle rules (ADR-012).
- The play feature owns the rAF loop (50 ms clamp, retained remainder, 20 ms accumulator), input,
  bounds measurement, HUD/enemy DOM writes, freeze listeners, and the one death-commit effect.
- Bosses are markers only. There is no player attack, boss entity/fight/defeat, currency award, node
  spending, win condition, or active-run persistence.

## Landscape and input

- The play screen is landscape-only; title, settings, skills, and not-found are responsive.
  `LandscapeGate` overlays the still-mounted play surface and adds `portrait`; returning to landscape
  removes it, adds `pause`, and opens the pause menu once. No auto-resume, no respawn (ADR-013).
- Touch `/play` shows a one-tap start overlay that requests fullscreen and attempts
  `screen.orientation.lock('landscape')`. Failure is non-blocking. iOS/Safari cannot lock; the gate is
  the fallback.
- Keyboard: WASD/arrows; Escape opens pause when active. Touch: pointer-driven joystick, touch/pen
  only, hidden on release. Player position and joystick knob are written via refs, not per-frame
  React state.
- A static, outline-only container (320 px `[unverified]`) is centered in the safe playfield. The
  player is clamped to its inner bounds; the screen is not a collision boundary. Enemies live in
  viewport space and ignore the arena outline. Container size is a future skill-tree upgrade.
- The play surface is full-bleed black with a faint grid, no header, and a HUD overlay that reserves
  no band. The scanline overlay is hidden on `/play`.

## Deliberate constraints — do not “fix”

- **No canvas/WebGL.** DOM-only is an accessibility and testability decision (ADR-002).
- **Clean URLs need a host fallback.** BrowserRouter is intentional (ADR-010); GitHub Pages uses
  `404.html` and accepts the HTTP 404 on deep links (ADR-016).
- **No state library yet.** Feature state + pure functions until measured need (ADR-003).
- **No runtime network.** Offline is a product requirement (ADR-001).
- **No CSS Modules.** Tailwind + theme tokens is the styling system (ADR-005).
- **Landscape-only play surface.** No portrait play layout or header. The HUD is in-run only.
- **Commit once at death, never continuous.** A run is in memory; an active-run save is a new scope
  decision (ADR-011).
- **Glow scope follows the run boundary.** In-run surfaces react to the slider; presentation pages
  and focus rings do not (ADR-015).
- **Dependencies are proposed, not installed.** Check `docs/dependency-candidates.md`; notify the
  author before adding a package; runtime dependencies need an ADR (ADR-003).

See `docs/decisions-not-to-fix.md` for the maintained list.
