# Architecture

## Stack

| Area        | Choice                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| UI          | React 19                                                               |
| Language    | TypeScript 6, strict + `noUncheckedIndexedAccess`                      |
| Build       | Vite 8                                                                 |
| Routing     | React Router 8, declarative mode, `BrowserRouter`                      |
| Styling     | Tailwind CSS 4; Cyberpunk-reference palette/composition                |
| Type        | Anton (hero), Chakra Petch (UI), Rajdhani (body), JetBrains Mono       |
| State       | Pure game domain + feature-owned run loop + React context for settings |
| Persistence | `localStorage`: versioned progression save envelope + settings v2      |
| Tests       | Vitest 5 + Testing Library + jsdom                                     |
| Quality     | ESLint 9 (type-aware), Prettier 3, `tsc`, pre-push hook, CI            |
| Package mgr | pnpm 12                                                                |

TypeScript and ESLint majors are pinned for compatibility: `typescript-eslint` 8.72 supports TypeScript
`<6.1`, and `eslint-plugin-jsx-a11y` 6.10 supports ESLint `^9`. Do not bump either alone; run the
full gate and update this table.

## Layers

```text
src/app       composition root: router, shell, presentation layout, providers, error boundary
src/features  screens and feature-owned state (title, play, settings, skills, not-found; play owns the run loop and gate)
src/game      pure domain: RNG, save envelope, player, run, timeline, progression, enemy rules
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

`src/app/app.tsx` uses declarative React Router with `BrowserRouter`:

| Path        | Screen           | Purpose                                                    |
| ----------- | ---------------- | ---------------------------------------------------------- |
| `/`         | `TitleScreen`    | Identity, entry points, system status                      |
| `/play`     | `PlayScreen`     | Landscape-only survival run: board, HUD, enemies, overlays |
| `/settings` | `SettingsScreen` | Local preferences and data reset                           |
| `/skills`   | `SkillsScreen`   | Saved progression and the locked node-map preview          |
| `*`         | `NotFoundScreen` | Route fallback                                             |

Clean URLs are deliberate ([ADR-010](../decisions/ADR-010-clean-browser-urls.md)). Vite dev and
preview provide history fallback; a static host must serve `index.html` for unknown paths with a 200
response. For a subpath deployment, set Vite `base` and `BrowserRouter` `basename` together.
`base: './'` keeps assets relative, but direct deep links still depend on the host fallback.

`AppShell` renders a skip control, the single `<main id="main-content">`, a scanline overlay, and
moves focus to main on route changes. The scanline overlay is hidden on `/play` so the play surface
stays a clean black field. `PresentationLayout` wraps `/`, `/settings`, `/skills`, and `*`; `/play`
is a sibling route outside it. The layout renders `SiteHeader` once and routes presentation content
through `<Outlet />`, so the header is not remounted when switching presentation pages. Settings and
skills use the dark route field; the title stays the yellow field. The play feature owns
`LandscapeGate`; the presentation routes remain responsive in portrait and landscape. `/play` is
deliberately headerless. Screens render sections, not nested `main` elements.

## Settings and local state

- `src/features/settings/settings-storage.ts` owns the key, schema version, load/save/clear, the
  system reduced-motion query, glow bounds, and the v1 → v2 settings migration.
- `src/features/settings/settings-provider.tsx` owns React state, persistence, the
  `data-reduced-motion` attribute, and the `--glow-intensity` custom property on `<html>`.
- `src/features/settings/settings-context.ts` exposes `useSettings`, including
  `setReducedMotion`, `setGlowIntensity`, and `resetLocalData`.
- Reset removes `shapebound:save`, clears `shapebound:settings`, resets to system defaults, and then
  the persistence effect writes the new settings defaults. It does not remove unrelated browser keys.
  The pause-menu config writes settings only; it cannot reset local data.
- `--glow-intensity` is consumed by every in-run surface and by the shared static `GlowPreview`.
  Presentation pages — title, settings chrome, `/skills`, and the site header — keep fixed glows and
  never read the setting. See [ADR-015](../decisions/ADR-015-in-run-glow-scope.md).

Storage keys:

```text
shapebound:settings   { version: 2, reducedMotion: boolean, glowIntensity: 0-100 }
shapebound:save       { schemaVersion: 1, savedAt: ISO string, data: ProgressionData }
```

### Progression record

The save payload is the v1 progression record from
[ADR-011](../decisions/ADR-011-progression-save-v1.md):

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-10-26T12:00:00.000Z",
  "data": {
    "bluePoints": 0,
    "bestTimeMs": 0,
    "runCount": 0,
    "bossCurrencies": { "purple": 0, "green": 0, "orange": 0 }
  }
}
```

- All four `data` fields are required. Missing or malformed data is `unreadable`, not defaulted.
- A missing key is `none` and uses the all-zero base. A valid record is read as stored.
- An `unreadable` record (`invalid-json`, `invalid-envelope`, `invalid-data`, or
  `unsupported-version`) blocks overwrite. Nothing is written and the run-over routes the player to
  `/settings` to reset local data. A failed write after a valid read is a separate, retryable
  `failed` state.
- Storage that is absent or throws is `unavailable`: no write is attempted and `/settings` reset is
  not presented as a repair.
- The commit happens once at death: `bluePoints` adds `floor(deathAtMs / 1000)`, `bestTimeMs` takes
  the max, `runCount` increments once, and boss currencies are copied unchanged. A failed write
  retries the same latched envelope and never adds the run twice.
- `src/features/play/progression-storage.ts` is the feature port; `src/game/progression.ts` owns the
  payload validation and commit arithmetic. `/skills` reads through the same port on mount.
- Boss currencies are reserved: no boss can be defeated and no boss currency is awarded or spent. The
  normal record keeps them at zero; a structurally valid nonzero value is preserved unchanged, never
  spent or fabricated.
- There is no active-run persistence. The seed, elapsed time, points, enemy world, banner, and commit
  latch are in memory only and are discarded by reload, browser back, route change, Restart, or
  Retry. The seed and cursor are not in the progression record.

A version 1 settings record is migrated on read with `glowIntensity: 100` (the pre-setting default
look); the persistence effect then rewrites it as version 2.

Browser storage is wrapped by `src/shared/lib/storage.ts`. Reads and writes are guarded because
storage can be unavailable in private/locked-down contexts. A failed write is reported as `false`,
not thrown.

## Game domain

The domain is pure values and transitions. Time, randomness, and persistence are inputs or ports; the
domain never reaches for them.

- `src/game/rng.ts` — seeded `mulberry32`; deterministic, non-cryptographic. `next()` returns
  `[0, 1)`, `nextInt(n)` returns an integer in `[0, n)`, and `getState()` exposes the cursor used by
  the enemy streams. The cursor is not persisted in the progression record.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, `createSave`, `serializeSave`, `parseSave`, and
  typed parse failures (`invalid-json`, `invalid-envelope`, `unsupported-version`, `invalid-data`).
- `src/game/player.ts` — `PlayerStats`, `PlayerState`, `PLAYER_BASE_STATS`,
  `PLAYER_CONTAINER_SIZE`, `createPlayer`, `clampPlayerToBounds`, `stepPlayer`, and `applyDamage`.
  Movement is normalized, clamped to the container bounds, and takes an injected `dtSeconds`.
  `maxHealth` above 1 becomes shield; damage consumes shield before the single health point.
- `src/game/run.ts` — `RunState`, the stacked `FreezeReason` set (`pause`, `hidden`, `portrait`,
  `focus`), `advanceRun`, freeze helpers, `endRun`, commit settlement/retry, `formatElapsed`, and the
  run constants. Active time is the only clock: points are derived as
  `floor(elapsedMs / 1000)`, the timer is truncated `mm:ss:cc`, and a boss marker starts every
  300 000 ms with a 2 500 ms banner. A frozen or over run does not advance.
- `src/game/timeline.ts` — generic timeline nodes and geometry. The visible window is 320 px /
  600 000 ms with a fixed 160 px playhead; it emits the start node and repeating five-minute boss
  placeholders. Node state is past, current, or future.
- `src/game/progression.ts` — `ProgressionData`, the four-way read union, validation, and the pure
  commit arithmetic. `MAX_BLUE_POINTS` is a `[unverified]` serialization bound, not an economy cap.
- `src/game/enemy-world.ts` — the pure viewport-space enemy world: a fixed 24-slot pool, spawn
  scheduling, caps, freeze/resize handling, two independent RNG streams, and the one-hit-per-step
  boundary.
- `src/game/enemy-spawn.ts` — side mapping, the 10–90% along-edge band, same-kind spacing, spawn
  gates, and the 64 px outside margin.
- `src/game/enemy-collision.ts` — swept red contact, rotated lane vs. square SAT, contact-time
  ordering, and the 80% hurtbox.
- `src/game/enemy-red-square.ts` and `src/game/enemy-orange-triangle.ts` — per-kind spawn, movement,
  aim, charge, fire, beam, exit, recycle, and lifetime rules.

Run behavior:

- A run starts active at zero with a new app-supplied seed. Touch starts after the START gate;
  desktop starts immediately.
- The feature loop clamps a raw frame delta to 50 ms, keeps the sub-millisecond remainder, and feeds
  the enemy world an integer 20 ms accumulator (at most 3 steps per frame). Enemy time is quantized
  and never exceeds the run clock.
- A fatal enemy hit ends the run once at the 20 ms step that accepted it, clamps `elapsedMs` to the
  death time, clears the banner and freeze reasons, and sets `commit: 'pending'`. A second death is a
  no-op; the commit effect reads once, latches one envelope, and writes once.
- Boss markers are presentation only. No boss entity spawns, no fight starts, and no currency is
  awarded. The run has no player attack and no win condition; death is the only end.

New rules should land as pure functions/reducer actions in `src/game`, with tests and a mechanic spec
from `design-a-mechanic`. If the rule changes state shape, save format, or architecture, follow the
spec/RFC/ADR path first.

### Future save migrations

The progression envelope remains v1 with no migration. The settings record is separate and is now v2;
its explicit v1 → v2 migration lives in `settings-storage.ts`. When the save envelope, progression
record, or settings schema advances, add an explicit linear migration, keep the old fixtures as tests,
and document the upgrade path here. Never silently reinterpret old data.

An active-run save, mid-run resume, or seed/cursor persistence is a new scope decision and a separate
record. Do not add those fields to the v1 progression payload.

## Rendering constraints

- **DOM only.** No canvas, WebGL, or canvas-backed library. This keeps accessibility, DOM testing,
  text selection, and CSS layout available (ADR-002).
- Animate `transform` and `opacity`, not layout properties. Avoid per-frame React state updates for
  decorative effects; prefer CSS.
- The player transform is written directly through a ref in the `requestAnimationFrame` loop. Do not
  mirror per-frame position in React state.
- The timer, points, timeline track/node transforms, and enemy node transforms are written
  imperatively through refs at most once per animation frame. React state changes on run status,
  freeze-set changes, banner presence, commit status, overlay visibility, and timeline
  membership/state only.
- The scanline overlay is decorative and `aria-hidden`. It is pointer-events-none and must never
  intercept input. It is hidden on `/play` so the board stays a clean black field.
- The play surface is functional. The grid, player, joystick, enemy layer, and overlays are DOM
  elements. The player, container outline, joystick, and enemy layer are `aria-hidden` visual
  representations; the player state is the source of truth. The enemy layer is a fixed pool of 24
  body nodes, 2 warning nodes, and 2 beam nodes (28 animated nodes), `pointer-events-none` and
  non-focusable. There is no per-enemy React component and no node allocation after world creation.
- The HUD overlays the board and reserves no band. Its visible timer is `role="timer"` with
  `aria-live="off"`; points are a labelled group; the visible track strip is `aria-hidden` while the
  legend is visible; a visually hidden list changes only when membership or state changes. The pause
  button is the HUD's only tab stop.
- The pause menu and run-over are native modal dialogs with focus entry, a trap, and focus return.
  Overlay priority is portrait gate, then run-over, then pause menu, then play.
- If a mechanic cannot be expressed well in the DOM, stop and write an RFC rather than adding canvas.

## Landscape, input, and the play surface

- **Play-only gate.** `src/features/play/use-landscape.ts` subscribes to `(orientation: portrait)`
  and `LandscapeGate` wraps only `PlayScreen`. The gate is a blocking overlay over the still-mounted
  play surface, not a replacement. In portrait it adds the `portrait` freeze reason; the board, HUD,
  and enemy layer remain in place and do not step. Returning to landscape removes `portrait`, adds
  `pause`, and opens the pause menu once. There is no auto-resume and nothing respawns. If the run is
  already over, portrait shows the gate and the return shows the run-over without adding `pause`. See
  [ADR-013](../decisions/ADR-013-portrait-pause.md).
- **Freeze set.** Reasons are stacked in canonical order `pause`, `hidden`, `portrait`, `focus`. The
  run is active exactly when `status === 'active'` and the set is empty. Hidden tabs add `hidden`;
  window blur while the document is visible adds `focus`, clears input, and opens no menu. The rAF
  timestamp baseline resets after a freeze, so no wall time is added and no enemy step catches up.
- **Touch start.** On touch devices, `/play` shows a one-tap start overlay. The tap requests
  fullscreen on the play surface and attempts `screen.orientation.lock('landscape')`. Both are
  feature-detected and caught; failure does not block the game. Desktop starts immediately. See
  [ADR-009](../decisions/ADR-009-static-player-container.md).
- **Fallback.** iOS/Safari and most desktop browsers do not support the lock. The rotate overlay is
  the only enforcement there. No PWA, manifest, service worker, or native wrapper is used for
  orientation.
- **Keyboard.** WASD and arrow keys move the player. Diagonal movement is normalized in the domain;
  opposite keys cancel. Input clears on window blur and when the document is hidden. Escape opens the
  pause menu when the run is active and the menu is closed; it never leaves the run paused with no
  menu.
- **Touch.** Pointer events drive the joystick. It anchors at the first touch/pen point, becomes an
  analog vector with a dead zone and clamped radius, follows the pointer through capture, and hides
  on release or cancel. Mouse pointers and secondary touches are ignored. The joystick is a visual
  indicator, not a separate control. The HUD top strip does not create a joystick anchor; earlier
  pointer handlers on the pause button stop propagation.
- **Player container.** A static, outline-only square is centered in the safe playfield. The player
  is rendered inside its inner content and clamped to that box; the screen is not a collision
  boundary. `PLAYER_CONTAINER_SIZE` starts at 320 px `[unverified]` and is intended to grow through
  skill-tree upgrades. Measurements are re-taken after a 200 ms resize settle.
- **Enemies.** Threats live in viewport space, not the arena. The layer measures its own bounding
  rect; spawns start at least 64 px off-screen and the arena outline never blocks them. The 20 ms
  step, 24-slot pool, caps (24 total, 12 red, 5 triangle, 2 warnings), and skip-never-evict policy
  come from [ADR-012](../decisions/ADR-012-viewport-enemy-simulation.md). Red squares aim once and
  travel straight; orange triangles stop, lock an aim, charge a hatched lane, and fire a hitscan beam
  once. Body contact damages only for the red square; the triangle only damages with its beam.
- **Play surface.** Full-bleed black with a faint `bg-grid`, no header, and no HUD band. The run HUD
  overlays the top edge: timer/points top-left, the 320 px timeline and legend top-center, and the
  44 px pause control top-right. A 320 px boss plate appears at each five-minute marker, compacting
  on short landscape. The grid and container outline are decorative and `aria-hidden`. A
  safe-area-inset playfield centers the container.
- **Pause.** Pause adds `pause` and opens a modal left-rail menu: Resume, Config, Restart, Back to
  title, and a focusable but `aria-disabled` Skill Tree item (`AVAILABLE AFTER THE RUN`). Config
  reuses the reduced-motion switch and glow range and writes settings only. Restart and Back to title
  use in-app confirmations with Cancel first and do not commit the run. Escape cancels a confirmation
  or resumes; an outside click neither closes nor resumes. Input is cleared while paused and focus
  returns to the pause control on Resume.
- **Run lifecycle.** Death opens the modal run-over with final time and points and the commit outcome
  (`saved`, `pending`, `failed`, `unreadable`, `unavailable`). Retry starts a new run immediately with
  a new seed and an empty enemy world; Open Skill Tree waits for the commit to settle; Back to title
  leaves; Retry save appears only for a failed write and retries the latched envelope. `unreadable`
  adds a `/settings` recovery route; `unavailable` explains blocked storage without presenting reset
  as a repair; the panel never presents a projected total as banked. The pause menu's Restart and
  Back to title discard the run with no commit. Reload, browser back, and route changes also discard
  it; no active-run state is saved.

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

- Domain: pure unit tests for RNG determinism/range, save envelope parsing/versioning, player spawn,
  movement, bounds, health-to-shield and damage order, run clock/freeze/banner/death/commit,
  timeline geometry and node states, progression validation and commit arithmetic, and enemy spawn,
  collision, pool, damage, freeze, and resize rules.
- Storage: fake in-memory storage; missing, valid, malformed, unsupported, unavailable, failed-write,
  and extra-key cases for the progression port.
- UI: settings persistence, glow intensity, and reset confirmation; the run HUD timer, points,
  timeline, hidden list, boss banner, and pause control; the 28-node enemy pool and reuse; pause menu
  confirmations, config, focus behavior, and portrait suspension; run-over commit states; `/skills`
  read states and the locked map; routing smoke tests for all five routes; the play gate
  portrait/landscape and the mounted-run behavior; pure joystick vector math.
- Settings storage: v1 → v2 migration, normalization, and malformed-record fallback.
- No E2E browser suite yet. Add Playwright when there is a stable browser flow worth automating.

## Decisions not to “fix”

See `docs/decisions-not-to-fix.md`. In short: clean URLs with a host fallback, no canvas, no state
library yet, Tailwind instead of CSS Modules, no runtime network, a pure domain, a landscape-only play
surface, commit-on-death progression, and the run's in-memory-only lifecycle are intentional.

## Adding a module

1. Decide whether it is app composition, a feature, the domain, or a shared primitive.
2. Respect the dependency direction; let ESLint prove it.
3. Add tests at the same time.
4. Update this doc, `docs/components.md`, and the relevant memory if the shape changed.
