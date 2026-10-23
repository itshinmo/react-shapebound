# Architecture

## Stack

| Area        | Choice                                                           |
| ----------- | ---------------------------------------------------------------- |
| UI          | React 19                                                         |
| Language    | TypeScript 6, strict + `noUncheckedIndexedAccess`                |
| Build       | Vite 8                                                           |
| Routing     | React Router 8, declarative mode, `HashRouter`                   |
| Styling     | Tailwind CSS 4; Cyberpunk-reference palette/composition          |
| Type        | Anton (hero), Chakra Petch (UI), Rajdhani (body), JetBrains Mono |
| State       | Pure game domain + React context for app settings                |
| Persistence | `localStorage`, versioned save envelope                          |
| Tests       | Vitest 5 + Testing Library + jsdom                               |
| Quality     | ESLint 9 (type-aware), Prettier 3, `tsc`, pre-push hook, CI      |
| Package mgr | pnpm 12                                                          |

TypeScript and ESLint majors are pinned for compatibility: `typescript-eslint` 8.72 supports TypeScript
`<6.1`, and `eslint-plugin-jsx-a11y` 6.10 supports ESLint `^9`. Do not bump either alone; run the
full gate and update this table.

## Layers

```text
src/app       composition root: router, shell, providers, error boundary
src/features  screens and feature-owned state (title, play, settings, not-found; play owns the gate)
src/game      pure domain: RNG, save envelope, player rules
src/shared    cross-cutting primitives: UI, storage helpers, app constants
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
src/test      Vitest setup and render helper
```

Dependency direction:

```text
app → features → game + shared
shared → nothing upward
game  → no React, DOM, storage, network, timers, Date.now, or Math.random
```

These are enforced in `eslint.config.js` with `import-x/no-restricted-paths` and restricted
imports/globals. The settings provider lives in `src/features/settings/`; `src/app/app.tsx` composes
it around the router. Features must not import the app root.

## Routing

`src/app/app.tsx` uses declarative React Router with `HashRouter`:

| Path        | Screen           | Purpose                                         |
| ----------- | ---------------- | ----------------------------------------------- |
| `/`         | `TitleScreen`    | Identity, entry points, system status           |
| `/play`     | `PlayScreen`     | Landscape-only movement board; no HUD or combat |
| `/settings` | `SettingsScreen` | Local preferences and data reset                |
| `*`         | `NotFoundScreen` | Route fallback                                  |

Hash routing is deliberate (ADR-001). It works from any static subpath without a server rewrite.
If clean URLs become a requirement, that is an ADR-level change: switch to `BrowserRouter`, configure
host fallback, and update this doc and the runbook.

`AppShell` renders a skip control, the single `<main id="main-content">`, a scanline overlay, and
moves focus to main on route changes. The scanline overlay is hidden on `/play` so the play surface
stays a clean black field. The play feature owns `LandscapeGate`; the title, settings, and not-found
routes remain responsive in portrait and landscape. Screens render sections, not nested `main`
elements.

## Settings and local state

- `src/features/settings/settings-storage.ts` owns the key, schema version, load/save/clear, and the
  system reduced-motion query.
- `src/features/settings/settings-provider.tsx` owns React state, persistence, and the
  `data-reduced-motion` attribute on `<html>`.
- `src/features/settings/settings-context.ts` exposes `useSettings`.
- Reset removes the save key, clears the settings key, resets to system defaults, and then the
  persistence effect writes the new defaults. It does not remove unrelated browser keys.

Storage keys:

```text
shapebound:settings   { version: 1, reducedMotion: boolean }
shapebound:save       { schemaVersion: 1, savedAt: ISO string, data: T }
```

Browser storage is wrapped by `src/shared/lib/storage.ts`. Reads and writes are guarded because
storage can be unavailable in private/locked-down contexts. A failed write is reported as `false`,
not thrown.

## Game domain

The first domain state is the player. The domain currently provides:

- `src/game/rng.ts` — seeded `mulberry32`; deterministic, non-cryptographic. `next()` returns
  `[0, 1)`, `nextInt(n)` returns an integer in `[0, n)`, `getState()` exposes the cursor for saves.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, `createSave`, `serializeSave`, `parseSave`, and
  typed parse failures (`invalid-json`, `invalid-envelope`, `unsupported-version`, `invalid-data`).
- `src/game/player.ts` — `PlayerStats`, `PlayerState`, `PLAYER_BASE_STATS`,
  `PLAYER_CONTAINER_SIZE`, `createPlayer`, `clampPlayerToBounds`, `stepPlayer`, and `applyDamage`.
  Movement is normalized, clamped to the container bounds, and takes an injected `dtSeconds`.
  `maxHealth` above 1 becomes shield; damage consumes shield before the single health point. There is
  no randomness and no damage source yet.

The next rules spec defines the next state and transitions. Implement them as pure functions/reducer
actions in `src/game`, with tests. Time, randomness, and persistence are inputs or ports; the domain
never reaches for them.

### Future save migrations

Schema v1 has no migrations. When v2 exists, add an explicit linear migration from v1 → v2, keep the
old fixtures as tests, and document the upgrade path here. Never silently reinterpret old data.

## Rendering constraints

- **DOM only.** No canvas, WebGL, or canvas-backed library. This keeps accessibility, DOM testing,
  text selection, and CSS layout available (ADR-002).
- Animate `transform` and `opacity`, not layout properties. Avoid per-frame React state updates for
  decorative effects; prefer CSS.
- The player transform is written directly through a ref in the `requestAnimationFrame` loop. Do not
  mirror per-frame position in React state.
- The scanline overlay is decorative and `aria-hidden`. It is pointer-events-none and must never
  intercept input. It is hidden on `/play` so the board stays a clean black field.
- The play surface is functional. The grid, player, joystick, and overlays are DOM elements. The
  player and joystick are `aria-hidden` visual representations; the player state is the source of
  truth. The HUD is not built.
- If a mechanic cannot be expressed well in the DOM, stop and write an RFC rather than adding canvas.

## Landscape, input, and the play surface

- **Play-only gate.** `src/features/play/use-landscape.ts` subscribes to `(orientation: portrait)`
  and `LandscapeGate` wraps only `PlayScreen`. In portrait it renders a blocking rotate overlay
  instead of the play surface. The title, settings, and not-found routes stay responsive. Returning
  to landscape remounts the play surface; in this slice the player respawns centered.
- **Touch start.** On touch devices, `/play` shows a one-tap start overlay. The tap requests
  fullscreen on the play surface and attempts `screen.orientation.lock('landscape')`. Both are
  feature-detected and caught; failure does not block the game. Desktop starts immediately. See
  [ADR-009](../decisions/ADR-009-static-player-container.md).
- **Fallback.** iOS/Safari and most desktop browsers do not support the lock. The rotate overlay is
  the only enforcement there. No PWA, manifest, service worker, or native wrapper is used for
  orientation.
- **Keyboard.** WASD and arrow keys move the player. Diagonal movement is normalized in the domain;
  opposite keys cancel. Input clears on window blur and when the document is hidden.
- **Touch.** Pointer events drive the joystick. It anchors at the first touch/pen point, becomes an
  analog vector with a dead zone and clamped radius, follows the pointer through capture, and hides
  on release or cancel. Mouse pointers and secondary touches are ignored. The joystick is a visual
  indicator, not a separate control. The player vector and the knob transform are written directly
  from `pointermove`; React state changes only when the joystick appears or disappears.
- **Player container.** A static, outline-only square is centered in the safe playfield. The player
  is rendered inside its inner content and clamped to that box; the screen is not a collision
  boundary. `PLAYER_CONTAINER_SIZE` starts at 320 px `[unverified]` and is intended to grow through
  skill-tree upgrades. The loop re-measures when the size changes.
- **Play surface.** Full-bleed black with a faint `bg-grid`, no header, and no HUD. The grid and
  container outline are decorative and `aria-hidden`. A safe-area-inset playfield centers the
  container.
- **State.** Player position lives in memory and is not saved. The HUD, pause, and a visible exit
  control are deferred; browser back is the exit path in this slice.

## Offline behavior

The app makes no runtime network requests. Fonts are bundled through Fontsource, not fetched from
Google Fonts. There is no service worker yet, so “offline” means the loaded page continues to work
without a connection; it does not yet mean installable or available after a hard reload with no
cache. A PWA layer needs an ADR and an update strategy.

## Quality gates

```sh
pnpm check        # Prettier + ESLint (0 warnings) + tsc + Vitest + Markdown links
pnpm verify       # check + production build
```

- `.githooks/pre-push` runs `pnpm check`. `pnpm install` sets `core.hooksPath` via `prepare`.
- CI (`.github/workflows/ci.yml`) runs `pnpm verify`.
- Boilerplate: tests are colocated, RTL queries prefer roles/labels, and new domain logic needs unit
  tests.

## Testing strategy

- Domain: pure unit tests for RNG determinism/range, save envelope parsing/versioning, and player
  spawn, movement, bounds, health-to-shield, and damage order.
- Storage: fake in-memory storage, failure and malformed-JSON cases.
- UI: component tests for settings persistence and reset confirmation; routing smoke tests for title
  and not-found; play gate portrait/landscape; play screen without header/HUD and with the touch
  start overlay; pure joystick vector math.
- No E2E browser suite yet. Add Playwright when there is real gameplay to exercise.

## Decisions not to “fix”

See `docs/decisions-not-to-fix.md`. In short: hash URLs, no canvas, no state library yet, Tailwind
instead of CSS Modules, no runtime network, a pure domain, and a landscape-only play surface are
intentional.

## Adding a module

1. Decide whether it is app composition, a feature, the domain, or a shared primitive.
2. Respect the dependency direction; let ESLint prove it.
3. Add tests at the same time.
4. Update this doc, `docs/components.md`, and the relevant memory if the shape changed.
