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

Dependency additions are proposed before installation; see
[`docs/dependency-candidates.md`](dependency-candidates.md). Runtime dependencies require an ADR;
dev dependencies still need an explanation, a measured need, and CI/bundle consideration.

## Layers

```text
src/app       composition root: router, shell, presentation layout, providers, error boundary
src/features  screens and feature-owned state (title, play, settings, skills, not-found; play owns the run loop and gate)
src/game      pure domain: RNG, save envelope, player, run, timeline, progression, upgrades, reflect shield, enemy rules
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

| Path        | Screen           | Purpose                                                     |
| ----------- | ---------------- | ----------------------------------------------------------- |
| `/`         | `TitleScreen`    | Identity, entry points, system status                       |
| `/play`     | `PlayScreen`     | Landscape-only survival run: board, HUD, enemies, overlays  |
| `/settings` | `SettingsScreen` | Local preferences and data reset                            |
| `/skills`   | `SkillsScreen`   | Interactive add-only skill tree, Reset Skills, saved values |
| `*`         | `NotFoundScreen` | Route fallback                                              |

Clean URLs are deliberate ([ADR-010](../decisions/ADR-010-clean-browser-urls.md)). The router
`basename` is derived from `import.meta.env.BASE_URL`; Vite `base` is `/` locally and
`/react-shapebound/` in the deploy build. A static host must serve `index.html` for unknown paths.
GitHub Pages cannot return a 200 for a deep link, so the deploy workflow copies `dist/index.html` to
`dist/404.html`; the app boots but the first response is HTTP 404
([ADR-016](../decisions/ADR-016-github-pages-deployment.md)). The `#main-content` skip link is an
in-page fragment handled by `AppShell`, not a route. GitHub Pages deploys the build artifact
published by `.github/workflows/deploy.yml`; the same workflow also refreshes a `gh-pages` snapshot.

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
shapebound:save       { schemaVersion: 2, savedAt: ISO string, data: ProgressionData }
```

### Progression record

The save payload is v2 from [ADR-017](../decisions/ADR-017-progression-save-v2.md). It keeps the four
v1 fields from [ADR-011](../decisions/ADR-011-progression-save-v1.md) and adds the seven required
upgrade levels:

```json
{
  "schemaVersion": 2,
  "savedAt": "2026-10-29T12:00:00.000Z",
  "data": {
    "bluePoints": 0,
    "bestTimeMs": 0,
    "runCount": 0,
    "bossCurrencies": { "purple": 0, "green": 0, "orange": 0 },
    "upgrades": {
      "barrierCount": 0,
      "movementSpeed": 0,
      "playerSize": 0,
      "arenaSize": 0,
      "reflectCharges": 0,
      "reflectChargeSpeed": 0,
      "laserPierce": 0
    }
  }
}
```

- The four base fields keep the ADR-011 rules. `upgrades` has all seven keys; each level is a safe
  integer in its node range (`barrierCount` 0–3, `movementSpeed` 0–5, `playerSize` 0–5, `arenaSize`
  0–5, `reflectCharges` 0–3, `reflectChargeSpeed` 0–4, `laserPierce` 0–2). Missing, malformed, or
  out-of-range levels are `unreadable` / `invalid-data`, never clamped or defaulted.
- A literal v1 envelope is valid input: `parseProgressionSave` applies the linear read-time migration
  that adds all seven levels at zero and preserves the four base fields. Reading does not write, so
  the stored bytes stay v1 until a death commit or tree transaction writes v2.
- Extra keys in `data`, `bossCurrencies`, or `upgrades` are accepted on read and omitted from every
  canonical write.
- A missing key is `none` and uses the all-zero v2 base. A valid record is read as stored.
- An `unreadable` record (`invalid-json`, `invalid-envelope`, `invalid-data`, or
  `unsupported-version`) blocks overwrite. A failed write after a valid read is a separate, retryable
  `failed` state.
- Storage that is absent or throws is `unavailable`: no write is attempted and `/settings` reset is
  not presented as a repair.
- The commit happens once at death: `bluePoints` adds `floor(deathAtMs / 1000)`, `bestTimeMs` takes
  the max, `runCount` increments once, boss currencies are copied unchanged, and all seven upgrade
  levels are copied unchanged. A failed write retries the same latched envelope and never adds the
  run twice.
- `src/features/play/progression-storage.ts` is the feature port; `src/game/progression.ts` owns the
  payload validation, migration, commit arithmetic, and the add-only purchase/reset transactions.
  `/skills` reads and writes through the same port.
- Boss currencies are reserved: no boss can be defeated and no boss currency is awarded or spent. The
  normal record keeps them at zero; a structurally valid nonzero value is preserved unchanged, never
  spent or fabricated.
- There is no active-run persistence. The seed, elapsed time, points, enemy world, banner, and commit
  latch are in memory only and are discarded by reload, browser back, route change, Restart, or
  Retry. The seed and cursor are not in the progression record.

**New-run gate.** Every new run — the initial start, run-over Retry, and pause Restart — reads
progression before creating a run, player, enemy world, clock, or loadout. Only `none` and `valid`
start. `unreadable` and `unavailable` render the feature-local `SaveGate` instead of the board:
`unreadable` offers the `/settings` local-data reset as the recovery route; `unavailable` explains
that storage is blocked and offers only Back to title. A blocked Retry or Restart discards the old run
and shows the gate rather than starting a base-loadout run.

**Tree transactions.** `/skills` shows saved blue points and best time/run count plus the saved levels.
A known node purchase reads once, calls `purchaseUpgrade`, and writes one full v2 envelope: the
target level `+1`, `bluePoints −1`. Reset Skills opens an in-app confirmation; Confirm calls
`resetUpgrades`, which zeroes all seven levels and refunds their sum capped at `MAX_BLUE_POINTS` in
one full-record write. Cancel writes nothing. A failed write leaves the displayed record unchanged and
is retried only by a new user action that re-reads. `/settings` local-data reset is different: it
removes the whole save and therefore every upgrade.

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
  `PLAYER_CONTAINER_SIZE` (the level-0 baseline), `createPlayer`, `clampPlayerToBounds`, `stepPlayer`,
  `applyDamage`, and `addBarrier`. Movement is normalized, clamped to the container bounds, and takes
  an injected `dtSeconds`. The player has exactly one health point plus `barrier`; a run starts at
  full barrier, damage consumes barrier before health, and `addBarrier` clamps to `maxBarrier`. There
  is no regeneration. The old health-point `shield` name is gone; barrier notches on the player's top
  edge now show the current/max buffer.
- `src/game/reflect-shield.ts` — the pure reflect charge and geometry foundation. A run starts at
  full charges; `advanceReflectShield` recharges one charge at a time on active 20 ms steps with a
  carried remainder, `spendReflectCharge` spends one, and `getRingProgress` returns 1 at max or
  `rechargeElapsedMs / rechargeMs`. `getShieldSegment` produces the 64 px tangent segment whose
  midpoint is `playerSize / 2 + 14` px from the player center with a unit radial normal. The module
  has no pointer input, reflection, beams, explosions, drops, React, DOM, or clock access. The play
  feature owns the input phase, aim normal, and visuals. The feature samples the current aim before
  the fixed-step loop as well as inside it, so re-engaging the shield points at the pointer on the
  next displayed frame even if that frame has no fixed step.
- `src/game/combat.ts` — the pure combat wrapper around `stepEnemies`. It advances shield recharge,
  resolves the input phase and aim, builds the shield descriptor, spends one charge per reflected
  beam, and resolves each reflection as an instant 12 px hitscan beam. Targets are ordered by
  distance from the shield midpoint then slot id; `1 + pierce` normal enemies are defeated. If the
  target count exhausts the pierce budget, the beam stops after the last allowed target; if pierce
  remains spare and every target fits, the visual continues to the viewport edge. The wrapper emits
  ordered `EnemyDefeated` events (with size and rotation), rolls the dedicated 5% barrier-drop stream
  once per defeat, and keeps 180 ms reflected-beam visuals. It also produces the per-frame preview
  paths for charging warning lanes. Reflected beams never damage the player or a boss. It has no
  React, DOM, storage, clock, timer, or `Math.random` access.
- `src/game/upgrades.ts` — the seven upgrade keys and maxima, the locked curves,
  `createEmptyUpgrades`, `isUpgradeLevels`, and `deriveLoadout`. Level 0 is the baseline (180 px/s,
  64 px player, 320 px arena, 0 barrier, 0 charges, 4000 ms recharge, 0 pierce). The play feature
  captures the derived `RunLoadout` once at run start and does not re-derive it mid-run.
- `src/game/run.ts` — `RunState`, the stacked `FreezeReason` set (`pause`, `hidden`, `portrait`,
  `focus`), `advanceRun`, freeze helpers, `endRun`, commit settlement/retry, `formatElapsed`, and the
  run constants. Active time is the only clock: points are derived as
  `floor(elapsedMs / 1000)`, the timer is truncated `mm:ss:cc`, and a boss marker starts every
  300 000 ms with a 2 500 ms banner. A frozen or over run does not advance.
- `src/game/timeline.ts` — generic timeline nodes and geometry. The visible window is 320 px /
  600 000 ms with a fixed 160 px playhead; it emits the start node and repeating five-minute boss
  placeholders. Node state is past, current, or future.
- `src/game/progression.ts` — v2 `ProgressionData`, `ProgressionV1Data`, the four-way read union,
  migration-aware parsing, validation, the pure commit arithmetic, and the add-only
  `purchaseUpgrade` / `resetUpgrades` transactions. `MAX_BLUE_POINTS` is a `[unverified]`
  serialization bound, not an economy cap.
- `src/game/enemy-world.ts` — the pure viewport-space enemy world: a fixed 36-slot pool, spawn
  scheduling, caps, freeze/resize handling, two independent RNG streams, the one-hit-per-step
  boundary, body contact, and shield reflection. The step exposes every beam fired in slot-id order
  and the reflected subset before the single player hit is selected. A reflection requires the
  outward shield face and a shield contact before the player hurtbox; ties reflect. Orange triangle
  body contact is a swept damage candidate that marks the triangle as damaged.
- `src/game/enemy-spawn.ts` — side mapping, the 10–90% along-edge band, same-kind spacing, spawn
  gates, and the 64 px outside margin.
- `src/game/enemy-collision.ts` — swept red/triangle contact, rotated lane vs. square SAT, beam-lane
  vs. shield contact and outer-side first-hit resolution, lane-vs-AABB entry distance, reflection
  direction and grazing epsilon, lane-vs-AABB entry distance, contact-time ordering, and the 80%
  hurtbox.
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
  awarded. The run has no direct player attack; instant reflected beams are the only damage source
  and do not damage bosses. There is no win condition; death is the only end.
- A started run captures `maxReflectCharges`, `rechargeMs`, and `pierce` into a pure combat state
  that begins with full charges. The play feature resolves `idle` / `armed` / `spent` from the mouse
  right button or a latched second touch each fixed step, advances recharge only while the run is
  active and unfrozen, and derives shield visibility from `maxCharges > 0 && charges > 0 && phase ===
'armed' && alive`. Releasing the source, spending the last charge, freeze, portrait, and death
  clear the shield. The aim normal is kept when the pointer is absent or inside the 1 px mouse / 8 px
  touch dead zone. An active shield reflects a warning lane only when the lane approaches its outward
  face and contacts it before the player hurtbox (ties reflect); the original orange beam stops at
  the shield and an instant 12 px cyan beam resolves from the **shield midpoint**. The reflected beam kills
  `1 + pierce` normal enemies in distance order, stops after its last allowed hit if the budget is
  exhausted, or continues to the viewport edge if pierce remains spare. Charging warning lanes that
  would reflect also draw dim preview lanes to their predicted endpoint.

New rules should land as pure functions/reducer actions in `src/game`, with tests and a mechanic spec
from `design-a-mechanic`. If the rule changes state shape, save format, or architecture, follow the
spec/RFC/ADR path first.

### Future save migrations

The progression envelope is now v2. `parseSave` accepts an optional migration map; the production
progression path is `parseProgressionSave`, which supplies the linear v1 → v2 migration that adds
seven zero upgrade levels and preserves the four base fields. The bare `parseSave` without a map stays
current-version-only, so a v1 record through it is `unsupported-version` by design. Reading a v1
record never writes: the stored envelope stays schema 1 until a legitimate death commit or tree
transaction writes v2. Keep literal v1 fixtures in tests; `createSave` now stamps 2 and cannot build a
v1 fixture.

The settings record is separate and already v2; its explicit v1 → v2 migration lives in
`settings-storage.ts`. When the save envelope, progression record, or settings schema advances again,
add an explicit linear migration, keep the old fixtures as tests, and document the upgrade path here.
Never silently reinterpret old data. Adding a required upgrade key is a schema decision: bump and
migrate, or define an explicit additive policy.

An active-run save, mid-run resume, or seed/cursor persistence is a new scope decision and a separate
record. Do not add those fields to the progression payload.

## Rendering constraints

- **DOM only.** No canvas, WebGL, or canvas-backed library. This keeps accessibility, DOM testing,
  text selection, and CSS layout available (ADR-002).
- Animate `transform` and `opacity`, not layout properties. Avoid per-frame React state updates for
  decorative effects; prefer CSS.
- The player transform is written directly through a ref in the `requestAnimationFrame` loop. Do not
  mirror per-frame position in React state. The charge-ring progress and shield-line transform/opacity
  are also written through refs; React state changes only on discrete charge, barrier, and input-phase
  events.
- The timer, points, timeline track/node transforms, enemy node transforms, shield line, reflected-beam
  nodes, preview nodes, and explosion nodes are written imperatively through refs at most once per
  animation frame. React state changes on run status, freeze-set changes, banner presence, commit
  status, overlay visibility, timeline membership/state, and the discrete shield/barrier values only.
- The play surface is functional. The grid, player, joystick, enemy layer, combat layer, and overlays
  are DOM elements. The player, container outline, joystick, enemy layer, combat layer, charge ring,
  and barrier notches are `aria-hidden` visual representations; the player and pure combat state are
  the source of truth. The enemy layer is a fixed pool of 36 body nodes, 6 warning nodes, and 6 beam
  nodes (48 animated nodes), `pointer-events-none` and non-focusable. The combat layer adds one
  shield-line node, 6 reflected-beam nodes, 6 preview nodes, and 12 explosion nodes (25 nodes in the
  combat layer). The player adds one charge-ring group and one barrier-notch group, for 75 in-run
  animated roots. There is no per-enemy React component and no enemy or combat-pool node allocation
  after mount; the barrier group is fixed for a run and changes only when a new run's captured
  `maxBarrier` changes.
- Layer order inside the play surface is board/grid, arena + player (with ring/notches), enemy layer
  `z-20`, movement/shield joysticks `z-20`, combat layer `z-[25]`, run HUD `z-30`, then the pause and
  run-over overlays. The combat layer is viewport-space, `overflow-hidden`, and clipped only by the
  viewport; the arena outline neither clips nor blocks the shield or beams. The shield line is a
  64 × 2 px cyan bar with `glow-track`; reflected beams are 12 px cyan bars with a 180 ms visual; the
  six preview lanes are dim 12 px cyan paths. Explosions are hollow square or rotated hollow
  triangle paths that start at the enemy size and expand to 48 px. The ring and notches have no
  independent glow. A reflected beam's original orange beam is truncated at the shield for its
  180 ms linger, so the incoming and reflected beams are both readable without pretending the
  original passes through the player.
- The scanline overlay is decorative and `aria-hidden`. It is pointer-events-none and must never
  intercept input. It is hidden on `/play` so the board stays a clean black field.
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
  menu. There is **no keyboard parry and no hidden shield binding**; this is the author-approved
  accessibility exception. The shield is mouse/touch only.
- **Desktop shield.** Holding the right mouse button on the play surface (not an interactive HUD
  control) engages the shield; the pointer position sets the angle from the player's current center
  on every fixed step, and pointer moves update it. Release, cancel, window blur, hidden tab, pause,
  portrait, and death disengage and preserve the previous aim normal. A left click does nothing. The
  play surface prevents the context menu; the pause control and HUD pointer strip stop propagation,
  so a right-click there neither pauses nor engages the shield. On a hybrid device the first shield
  source (mouse or touch) wins until it releases. While active, a warning lane that reaches the
  outward face first reflects, spends a charge, and becomes an instant cyan beam; the shield hides
  after the last charge until release and a new press.
- **Touch.** Pointer events drive two independent roles. The first non-mouse pointer becomes
  movement; the second simultaneous pointer becomes the shield only when Reflect Charges is above 0,
  a charge is available, and no shield pointer is latched. Further pointers are ignored. Movement
  uses the solid/round joystick and the shield uses the dashed base/diamond knob joystick; the
  shield vector is anchor → pointer with the existing 8 px dead zone, and a zero vector keeps the
  previous aim normal. Lifting movement keeps the shield latched and lets the next touch become
  movement; lifting or cancelling the shield pointer hides the shield and joystick immediately while
  movement continues. Mouse pointers never create touch joysticks. The HUD top strip creates no
  gesture anchor; pointer handlers on the pause button stop propagation.
- **Player container.** A static, outline-only square is centered in the safe playfield. The player
  is rendered inside its inner content and clamped to that box; the screen is not a collision
  boundary. Its configured size comes from `deriveLoadout(levels).arenaSize` (320–420 px
  `[unverified]`); the player square edge comes from the same loadout (64–24 px). Measurements are
  re-taken after a 200 ms resize settle, a new run, and a loadout change. On a viewport too small for
  the configured square, the measured inner box is smaller and the player clamps to it.
- **Enemies.** Threats live in viewport space, not the arena. The layer measures its own bounding
  rect; spawns start at least 64 px off-screen and the arena outline never blocks them. The 20 ms
  step, 36-slot pool, caps (36 total, 24 red, 12 triangle, 6 warnings), and skip-never-evict policy
  come from [ADR-012](../decisions/ADR-012-viewport-enemy-simulation.md). Current test tuning aligns
  triangle spawns with red: first attempt 2 000 ms, 900 ms cadence, target capped at 12. Red squares
  aim once and travel straight; orange triangles stop, lock an aim, charge a hatched lane, and fire a
  hitscan beam once. Body contact damages for both enemy kinds; a triangle body hit marks that
  activation so it cannot hit twice. An active shield reflects a locked lane only when it approaches
  the outward face and is contacted before the player hurtbox (ties reflect). The reflected 12 px cyan
  beam is instant, defeats up to `1 + pierce` normal enemies in distance order, stops after its last
  allowed hit if the budget is exhausted, or continues to the viewport edge if pierce remains spare,
  and rolls the 5% barrier drop. Reflected beams never damage the player or a boss. Charging warnings
  that would reflect draw dim preview lanes.
- **Play surface.** Full-bleed black with a faint `bg-grid`, no header, and no HUD band. The run HUD
  overlays the top edge: timer/points top-left, the 320 px timeline and legend top-center, and the
  44 px pause control top-right. A 320 px boss plate appears at each five-minute marker, compacting
  on short landscape. The grid and container outline are decorative and `aria-hidden`. A
  safe-area-inset playfield centers the container. The player-local charge ring/digit sits inset 4 px
  inside the player, and up to three 5 × 2 px barrier notches sit on its top edge. The active shield
  line, instant reflected beams, preview lanes, and explosions live in the viewport-space combat layer
  above the joysticks; the shield is a 64 × 2 px cyan `glow-track` bar, beams and previews are 12 px
  cyan lanes, and explosions are 450 ms hollow squares or rotated triangles. The shield, beams, and
  previews are hidden or removed by the domain state.
- **Pause.** Pause adds `pause` and opens a modal left-rail menu: Resume, Config, Restart, Back to
  title, and a focusable but `aria-disabled` Skill Tree item (`AVAILABLE AFTER THE RUN`). Config
  reuses the reduced-motion switch and glow range and writes settings only. Restart and Back to title
  use in-app confirmations with Cancel first and do not commit the run. Escape cancels a confirmation
  or resumes; an outside click neither closes nor resumes. Input is cleared while paused and focus
  returns to the pause control on Resume.
- **Run lifecycle.** Death opens the modal run-over with final time and points and the commit outcome
  (`saved`, `pending`, `failed`, `unreadable`, `unavailable`). Retry re-reads the save and starts a new
  run only when the read is `none` or `valid`; if it is blocked, the run-over closes and the save gate
  replaces it. Retry and Restart also discard the old shield state, ring progress, and barrier count
  and recreate full charges/barrier from the newly captured loadout when the gate allows a run. Open
  Skill Tree waits for the commit to settle; Back to title leaves; Retry save appears
  only for a failed write and retries the latched envelope. `unreadable` adds a `/settings` recovery
  route and the Retry helper `RE-CHECKS LOCAL SAVE // NEW RUN MAY BE BLOCKED`; `unavailable` explains
  blocked storage without presenting reset as a repair; the panel never presents a projected total as
  banked. The pause menu's Restart re-reads after its confirmation and shows the gate when blocked;
  Back to title discards the run with no commit. Reload, browser back, and route changes also discard
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
- Deployment (`.github/workflows/deploy.yml`) runs `pnpm check` and `pnpm build` with
  `VITE_BASE=/react-shapebound/` on pushes to `main` (and manual dispatch from `main`), copies
  `index.html` to `404.html`, uploads `dist/` as the Pages artifact, deploys it with
  `actions/deploy-pages`, and force-pushes a fresh `gh-pages` snapshot.
- Boilerplate: tests are colocated, RTL queries prefer roles/labels, and new domain logic needs unit
  tests.

## Testing strategy

- Domain: pure unit tests for RNG determinism/range, save envelope parsing/versioning and migration,
  player spawn, movement, bounds, barrier damage order and clamping, upgrade validation and
  `deriveLoadout` at every level, reflect charge/recharge/spend/ring progress and shield geometry,
  first-contact/outer-face reflection, instant beam targeting/pierce/stopping, preview paths, defeat
  ordering, barrier drops, and death order, run clock/freeze/banner/death/commit, timeline geometry
  and node states, progression v1/v2 validation, migration, commit, purchase, and reset arithmetic,
  and enemy spawn, collision, pool, body damage, freeze, resize, beam exposure, and reflection rules.
- Storage: fake in-memory storage; missing, valid v1/v2, malformed, unsupported, unavailable,
  failed-write, and extra-key cases for the progression port, including no write on a v1 read.
- UI: settings persistence, glow intensity, and reset confirmation; the run HUD timer, points,
  timeline, hidden list, boss banner, and pause control; the 48-node enemy pool and reuse; pause menu
  confirmations, config, focus behavior, and portrait suspension; run-over commit states and the
  new-run Retry helper; the interactive `/skills` tree, purchase, reset confirmation, focus, read
  states, and write failures; the `/play` save gate and blocked Retry/Restart; routing smoke tests for
  all five routes; the play gate portrait/landscape and the mounted-run behavior; pure joystick
  vector math; mouse right-button and dual-touch shield sources; the player charge ring and barrier
  notches; shield/joystick hide behavior on pause, portrait, death, and release; the 6 instant beam,
  6 preview, and 12 explosion nodes, beam/preview transforms, explosion timing/reuse/shape, and
  reduced-motion suppression; and a reflected-beam charge spend. The 120 ms barrier hit cue is tested
  both normally and under reduced motion.
- Settings storage: v1 → v2 migration, normalization, and malformed-record fallback.
- No E2E browser suite yet. Add Playwright when there is a stable browser flow worth automating.

## Decisions not to “fix”

See `docs/decisions-not-to-fix.md`. In short: clean URLs with a static-host fallback, no canvas, no state
library yet, Tailwind instead of CSS Modules, no runtime network, a pure domain, a landscape-only play
surface, commit-on-death progression, and the run's in-memory-only lifecycle are intentional.

## Adding a module

1. Decide whether it is app composition, a feature, the domain, or a shared primitive.
2. Respect the dependency direction; let ESLint prove it.
3. Add tests at the same time.
4. Update this doc, `docs/components.md`, and the relevant memory if the shape changed.
