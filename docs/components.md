# Components

## Shared primitives

| Component      | Path                              | Purpose                                | Notes                                                                                                    |
| -------------- | --------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Button`       | `src/shared/ui/button.tsx`        | Action button                          | `primary`, `secondary`, `ghost`, `danger`, `inverse`; md/lg                                              |
| `LinkButton`   | `src/shared/ui/button.tsx`        | Navigation styled as a button          | Uses React Router `Link`; same variants                                                                  |
| `Panel`        | `src/shared/ui/panel.tsx`         | Clipped surface with outline treatment | `default`, `acid`, `cyan`, `red` tones                                                                   |
| `SiteHeader`   | `src/shared/ui/site-header.tsx`   | Shared black/acid presentation header  | `01 // TITLE` through `04 // SKILLS`; rendered by `PresentationLayout`; never used on `/play`            |
| `SectionLabel` | `src/shared/ui/section-label.tsx` | `/// LABEL` module marker with tail    | Cyan by default; acid/red variants                                                                       |
| `ShapeMark`    | `src/shared/ui/shape-mark.tsx`    | Original geometric identity mark       | Inline SVG, decorative, `aria-hidden`                                                                    |
| `GlowPreview`  | `src/shared/ui/glow-preview.tsx`  | Static half-scale in-run preview       | Used by settings and pause config; arena, player, enemy, warning lane, timeline, boss plate; visual only |

Variant styles live in `src/shared/ui/button-styles.ts` so the file exports only components. Callers
may pass layout classes through `className`; do not rely on class merging to override a variant.
`GlowPreview` was promoted from the settings feature when the pause config became its second
consumer. It is `aria-hidden`, non-interactive, uses `--glow-scale: 0.5`, and is the only static
preview that consumes `--glow-intensity`; it appears on `/settings` and in the pause config.

## App furniture

| Component            | Path                              | Purpose                                                      |
| -------------------- | --------------------------------- | ------------------------------------------------------------ |
| `AppShell`           | `src/app/app-shell.tsx`           | Skip control, single `<main>`, scanline overlay, route focus |
| `PresentationLayout` | `src/app/presentation-layout.tsx` | Persistent `SiteHeader`, route field, page backgrounds       |
| `AppErrorBoundary`   | `src/app/app-error-boundary.tsx`  | Recovery screen for render failures                          |
| `App`                | `src/app/app.tsx`                 | Providers + `BrowserRouter` + layout routes                  |

The global scanline overlay is hidden on `/play`. `PresentationLayout` renders `SiteHeader` once and
gives `/settings` and `/skills` the dark field; the title keeps the yellow field. The landscape gate
is feature-owned by the play screen, so the title, settings, skills, and not-found routes stay
responsive.

## Feature screens

| Screen           | Path                                          | State / notes                                                                                       |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `TitleScreen`    | `src/features/title/title-screen.tsx`         | Yellow hero, entry CTAs (`INITIALIZE`, `SKILL TREE`, `CONFIGURE`), development-history module strip |
| `HeroArt`        | `src/features/title/hero-art.tsx`             | Original abstract SVG hero composition                                                              |
| `PlayScreen`     | `src/features/play/play-screen.tsx`           | Full-bleed run board; gate, run loop, HUD, enemies, pause, run-over                                 |
| `SettingsScreen` | `src/features/settings/settings-screen.tsx`   | Reduced motion; glow intensity + static preview; reset; layout header                               |
| `SkillsScreen`   | `src/features/skills/skills-screen.tsx`       | Interactive add-only tree, purchase/reset writes, read states, reserved boss rows                   |
| `NotFoundScreen` | `src/features/not-found/not-found-screen.tsx` | Yellow fallback with glitched, briefly flipping 404; layout header                                  |

Settings state is feature-owned:

| Module         | Path                                          |
| -------------- | --------------------------------------------- |
| context + hook | `src/features/settings/settings-context.ts`   |
| provider       | `src/features/settings/settings-provider.tsx` |
| storage/schema | `src/features/settings/settings-storage.ts`   |
| screen         | `src/features/settings/settings-screen.tsx`   |

Play state and integration are feature-owned:

| Module                 | Path                                       | Purpose                                                                 |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `PlayScreen`           | `src/features/play/play-screen.tsx`        | New-run save gate, loadout capture, board, HUD, overlays                |
| `SaveGate`             | `src/features/play/save-gate.tsx`          | Blocking unreadable/unavailable new-run state; no board or HUD          |
| `LandscapeGate`        | `src/features/play/landscape-gate.tsx`     | Portrait overlay over the mounted play surface or save gate             |
| `useLandscape`         | `src/features/play/use-landscape.ts`       | Portrait media-query subscription for the play gate                     |
| `useRunLoop`           | `src/features/play/use-run-loop.ts`        | rAF loop, frame clamp, fixed-step accumulator, freeze listeners, commit |
| `progression-storage`  | `src/features/play/progression-storage.ts` | `readProgression`, `writeProgression`, `clearProgression` port          |
| `run-seed`             | `src/features/play/run-seed.ts`            | App-supplied uint32 run seed                                            |
| `PlayerContainer`      | `src/features/play/player-container.tsx`   | Static outline arena; `glow-arena` follows glow intensity               |
| `PlayerSquare`         | `src/features/play/player-square.tsx`      | Acid square; charge ring/digit, barrier notches, barrier-hit outline    |
| `CombatLayer`          | `src/features/play/combat-layer.tsx`       | Viewport shield line, 6 instant beams, 6 previews, 12 explosions        |
| `TouchJoystick`        | `src/features/play/touch-joystick.tsx`     | Movement (solid/round) and shield (dashed/diamond) joystick visuals     |
| `StartOverlay`         | `src/features/play/start-overlay.tsx`      | Touch-only start, fullscreen, and orientation-lock gesture              |
| `RunHud`               | `src/features/play/run-hud.tsx`            | Overlay HUD; timer/points, timeline, banner, pause control              |
| `RunTimer`             | `src/features/play/run-timer.tsx`          | Imperative `mm:ss:cc` timer and blue-point readout                      |
| `RunTimeline`          | `src/features/play/run-timeline.tsx`       | 320 px track, nodes, legend, hidden accessible list                     |
| `BossBanner`           | `src/features/play/boss-banner.tsx`        | Five-minute boss marker plate; `role="status"`                          |
| `EnemyLayer`           | `src/features/play/enemy-layer.tsx`        | Preallocated 36 body + 6 warning + 6 beam DOM pool                      |
| `PauseMenu`            | `src/features/play/pause-menu.tsx`         | Native modal pause, config, confirmations, locked Skill Tree            |
| `RunOverOverlay`       | `src/features/play/run-over-overlay.tsx`   | Modal death summary, commit states, Retry/leave actions                 |
| `useKeyboardInput`     | `src/features/play/use-keyboard-input.ts`  | WASD/arrows; clears on blur, hidden tab, pause, portrait                |
| `useMouseShield`       | `src/features/play/use-mouse-shield.ts`    | Right-button source, window tracking, release/clear, context-menu stop  |
| `useTouchControls`     | `src/features/play/use-touch-controls.ts`  | Dual roles: movement first, shield second; analog vectors, knob writes  |
| `shield-input`         | `src/features/play/shield-input.ts`        | Feature-owned `ShieldSource` and `ShieldInputPhase` types               |
| `getJoystickVector`    | `src/features/play/joystick-vector.ts`     | Pure anchor/point → clamped vector and knob offset                      |
| `requestLandscapeLock` | `src/features/play/orientation-lock.ts`    | Guarded fullscreen + landscape lock and cleanup                         |
| `isTouchDevice`        | `src/features/play/is-touch-device.ts`     | Coarse-pointer / `maxTouchPoints` detection                             |

The player rules live in `src/game/player.ts`; the reflect charge/geometry rules live in
`src/game/reflect-shield.ts`; the combat wrapper, instant beams, previews, defeats, and barrier drops
live in `src/game/combat.ts`. The play feature imports them and never duplicates them.
`PLAYER_CONTAINER_SIZE` remains the level-0 baseline constant, but the live arena and player sizes
come from the captured `deriveLoadout(levels)` result (`arenaSize`, `playerSize`). The player has one
health point plus barrier. The charge ring/digit and barrier notches are implemented player-local
overlays; the shield line, right-mouse input, dual-touch input, one-sided first-contact reflection,
instant beams, previews, shape-matched explosions, and 5% barrier drops are implemented. Orange
triangle body contact also damages. There is no barrier HUD.

### Player overlays, shield line, and input

`PlayerSquare` owns three `aria-hidden`, `pointer-events-none` overlays. The charge ring is inset
4 px, has a 2 px stroke and `playerSize - 8` outer diameter, draws its track at
`ink-inverse`/25 % and progress in solid `ink-inverse`, starts at 12 o'clock, and centers the
current-charge digit in `font-mono tabular-nums`. It renders only when `maxReflectCharges > 0`;
`ringProgress` is 1 at max charges or `rechargeElapsedMs / rechargeMs` while missing. Barrier notches
are one group at the top edge with exactly `maxBarrier` 5 × 2 px slots (2 px gap); filled slots are
`bg-ink-inverse`, empty slots use `border-ink-inverse/40`, and the group is absent at max 0. The
120 ms barrier-hit cue is `outline-2 outline-ink` on the player and is omitted under reduced motion.
The ring progress is written through a circle ref; the player transform remains imperative.

`CombatLayer` is a viewport-space `absolute inset-0 z-[25] overflow-hidden pointer-events-none`
layer with one preallocated shield-line node, six instant reflected-beam nodes, six preview nodes,
and twelve explosion nodes. The line is 64 × 2 px `bg-cyan text-cyan glow-track`; its midpoint, 14 px
outside the player square, is written with `translate3d` + `rotate()` each frame. It is `opacity-0`
unless the shield is active. Reflected beams are 12 px cyan `glow-track` lanes that start at the
**shield midpoint**, pass through every allowed target, and last 180 ms. They stop after the last
allowed target when the pierce budget is exhausted, or continue to the viewport edge when pierce
remains spare. The six preview lanes are dim 12 px cyan paths for charging warnings that would
reflect; they update in real time and are hidden on release/freeze/death. Beam and preview nodes use a
top-left transform origin so the shield midpoint is the start of the line. Explosions are hollow SVG
paths: a square for a red square, or the enemy triangle silhouette rotated to its aim. They start at
the enemy size, expand to 48 px, fade over 450 ms, and reuse the oldest node when all twelve are active;
reduced motion suppresses them. The layer is above the two `z-20` joystick layers and below the
`z-30` HUD.
`EnemyLayer.write` accepts beam-length overrides so a reflected beam's original orange lane is
truncated at the shield for its linger.

`useMouseShield` engages only on a right-button pointer down on the play surface, records the pointer
in viewport coordinates, updates on window pointer moves, and releases on right pointer up/cancel,
blur, hidden, pause/portrait/death, or source loss. It prevents the surface context menu. HUD controls
stop the pointer down, so right-clicking the pause control does not engage. Left clicks are ignored.
`useTouchControls` assigns the first non-mouse pointer to movement and the second to the shield only
when `maxCharges > 0`, `charges > 0`, and no shield pointer is latched. Roles persist until their
pointer lifts; movement can lift while the shield stays latched; shield release hides it immediately.
A third pointer is ignored and mouse pointers never create joysticks. The shield joystick uses the
dashed base and diamond knob, anchors at the second pointer, and keeps the previous normal inside its
8 px dead zone. `ShieldSource`/`ShieldInputPhase` live in `shield-input.ts`; the play screen keeps the
aim normal and phase, and first source wins on a hybrid device. The current aim is sampled every
display frame before the fixed-step loop, so a release and re-press immediately points the shield at
the new pointer position instead of holding the previous normal until movement. A reflected beam
spends a charge, starts at the **shield midpoint**, and hides the shield immediately if that was the
last charge; a held input stays `spent` until release, and a returning charge does not re-arm it.

### Run HUD and timeline

`RunHud` is an absolute top overlay with `pointer-events-none`; it reserves no arena band. The timer
and point readout sit top-left, the genuinely centered 320 px timeline top-center, and the 44 px pause
button top-right. The HUD has exactly one tab stop: the pause button. A translucent top scrim and a
pointer-blocking strip keep a gesture from anchoring the joystick in the HUD area.

`RunTimer` writes the clock and point text imperatively. The timer is `role="timer"` with
`aria-live="off"`, is not a live region, and first shows one point at exactly 1 000 ms. `RunTimeline`
writes the track transform imperatively and updates React state only when visible node membership or
past/current/future state changes. The visible track strip is `aria-hidden` while the legend stays
visible; a visually hidden list carries the accessible names and states. `BossBanner` is a 320 px
plate with a compact 44 px single row on short landscape, `role="status"`, and
`pointer-events-none`; the timeline dims while it is visible.

### Pause menu

`PauseMenu` is a native `<dialog>` opened with `showModal()`, with a backdrop, a modal focus trap, and
focus return. It opens as a left rail: Resume, Config, Restart, Back to title, and a focusable
`aria-disabled` Skill Tree item labelled `AVAILABLE AFTER THE RUN`. Selecting Config, Restart, or
Back to title reveals the right panel; Config reuses the reduced-motion switch and glow range and
persists changes immediately. Restart and Back to title use in-app confirmations with Cancel first.
Escape cancels a confirmation or resumes; an outside click neither closes nor resumes. The run stays
frozen for the menu's lifetime. The frame expands when a section is selected; it is not rail-anchored
and has no entrance/collapse animation in the current implementation.

### Run-over

`RunOverOverlay` is a native modal `<dialog>` with the final time, final blue points, and the commit
state. `saved` shows `PROGRESS SAVED` and the committed balance when the run scored points; a
zero-point run says `NO POINTS THIS RUN`. `pending` shows a static committing line and disables
Open Skill Tree until settled; `failed` shows `SAVE FAILED — POINTS NOT SAVED` and a `Retry save`
control that retries the same latched envelope; `unreadable` shows one warning and an
`Open Settings` recovery route with no save retry; `unavailable` explains that storage is blocked
without presenting reset as a repair. In both blocked commit states Retry keeps `RE-CHECKS LOCAL
SAVE // NEW RUN MAY BE BLOCKED` as its helper and re-reads the save: a blocked read closes the
run-over and shows `SaveGate` instead of starting a run. Open Skill Tree waits for the commit to
settle, Back to title leaves, and Escape does nothing. The run-over never presents a projected total
as banked.

`SaveGate` is a feature-local fixed `section role="alert"` at `z-[150]`, below the `z-[200]` portrait
gate. It has no board, HUD, joystick, start overlay, pause, or run-over. `unreadable` offers
`Open Settings` (`/settings`) and Back to title; `unavailable` offers only Back to title. It focuses
itself on mount, becomes inert while portrait, and restores its focus when landscape returns. Pause
Restart re-reads after confirmation and redirects here when the save is blocked.

### Skills page

`SkillsScreen` reads progression once on mount through the feature port. Readable states show the
saved blue points, best time, run count, and a four-branch tree. The seven known nodes are native
`button`s in branch order (Barrier Count; Movement Speed; Player Size, Arena Size; Reflect Charges,
Charge Speed, Laser Pierce); five static `FUTURE NODE` placeholders stay non-interactive. One
activation adds exactly one level and spends one blue point. The page keeps its last successfully
written `ProgressionData`; a purchase or confirmed reset performs one read and one write, and a
failed write leaves the displayed values unchanged with a visible alert.

`Reset Skills` sits in the tree footer, visually separate from the nodes. It is focusable but
`aria-disabled` when `spent === 0`, with the visible reason `NO LEVELS PURCHASED // NOTHING TO
REFUND`. Activation opens a native modal confirmation; Cancel or Escape does not read or write, and
Confirm clears all seven levels and refunds their sum (capped at `MAX_BLUE_POINTS`). Focus returns to
the reset button after Cancel or success, and stays on Confirm after a failed write. The reserved
boss currency rows remain zero and non-interactive. `unreadable` replaces the balance row with the red
panel and a `/settings` route and renders a static `READ BLOCKED` tree; `unavailable` does the same
without offering settings as a repair. Readable states always offer `START A RUN` and BACK TO TITLE;
the unreadable state offers BACK TO TITLE plus the `/settings` recovery route, while unavailable
storage offers BACK TO TITLE only.

The tree has no in-run barrier/charge/shield widget; those visuals are player-local on `/play`. The
tree is ordinary presentation UI with fixed glows; it never reads `--glow-intensity`.

## Rules

- `src/shared/**` may not import `src/app`, `src/features`, or `src/game`.
- `src/features/**` may not import `src/app`.
- `src/game/**` may not import React, the DOM, browser storage, or shared UI.
- The play surface is landscape-only and full-bleed. Do not add a portrait play layout or a header.
  The run HUD is an overlay with no reserved band; new in-run surfaces must follow the glow scope.
  Presentation pages stay responsive.
- `PresentationLayout` renders `SiteHeader` once for the presentation route group; child routes
  change through `<Outlet />` without remounting the header. `/play` is outside the layout and is
  deliberately headerless.
- Clipped surfaces use `clip-border` with `--clip-border` and `--clip-fill`. The element background
  is the border; an inset `::before` fills the shape. Do not put `border-*` or `bg-*` on a
  `clip-border` element: CSS clips the border at the diagonal, and `bg-*` would overwrite the
  border color. The utility is the canonical fix for buttons, panels, the site header, the title art
  panel, and the skip link.
- All button variants have hover, active, and visible focus states. Focus uses a 2px cyan
  `clip-border` ring; ghost uses a focus background. Danger is a red fill with black text.
- The player, joystick, arena outline, enemy layer, combat layer, charge ring, and barrier notches are
  `aria-hidden` visual representations; the domain state is the source of truth. The HUD's hidden
  timeline list is the accessible equivalent of the visible track. The shield, previews, beams,
  explosions, ring, and notches add no tab stops; the pause button remains the HUD's only tab stop.
  There is no keyboard parry.
- Glow intensity is mirrored to `--glow-intensity`; every in-run surface and the static preview
  consume it. The shield line, instant beams, and preview lanes are additional `glow-track`
  consumers; explosions use `glow-enemy`; the ring and notches have no independent glow. Presentation
  pages, the HUD timer/points/legend/scrim, the menu button, pause dialog frame/buttons, and all focus
  rings use fixed or no glows. See [ADR-015](../decisions/ADR-015-in-run-glow-scope.md).
- The reduce-motion switch keeps its 150ms thumb transition in both directions, even while reduced
  motion is active, because the thumb position is state feedback. `.motion-switch` opts only that
  control out of the global transition disable; do not reuse the escape hatch elsewhere.
- Feature-specific composition stays in the feature; only reusable primitives move to shared.
- Add a primitive when the second screen needs it, not the first.
- Tests query by role, label, or text. Test IDs are a last resort.
- Use `inverse` buttons on yellow fields; `primary` on black fields.
- Keep reference-derived art original. Do not copy Cyberpunk 2077 assets or proprietary fonts.
- Update this file when the inventory or ownership changes.

## Testing coverage today

- `Button`/`LinkButton` are exercised through the settings, skills, pause, run-over, and title
  screens.
- `SiteHeader` is exercised through the title, settings, skills, and not-found routes.
- `PresentationLayout` is exercised through the title, settings, skills, and not-found routes; the
  play route is verified to render outside it.
- `SettingsScreen` covers reduced-motion and glow-intensity persistence, the static preview, and the
  two-step reset.
- `settings-storage` covers v1 → v2 migration, glow normalization, malformed-record fallback, and
  save output.
- `App` covers root, settings, skills, play, and unknown-route rendering with clean URLs, including
  the title's development-history module strip.
- `LandscapeGate` and `PlayScreen` cover portrait blocking, the mounted run behind the gate, the
  pause menu, focus freeze, pause/restart/resume, portrait return, and the run-over mount.
- `RunHud` covers the timer, points, timeline geometry/state, hidden list, boss banner, glow tokens,
  and the pause control.
- `EnemyLayer` covers the 36 + 6 + 6 node pool, imperative writes, reuse, clearing, and truncating a
  reflected beam lane at the shield while keeping the other beam lane.
- `PauseMenu` covers the rail, config, confirmations, Escape, outside click, locked Skill Tree,
  suspended/restore, and reduced motion.
- `RunOverOverlay` covers saved, pending, failed, unreadable, and unavailable states, the Settings
  route, the new-run helper, and the latched retry.
- `useRunLoop` covers frame clamp, remainder, fixed steps, frozen states, portrait return, death,
  single commit, v1/v2 commit payloads, failed retry, and restart.
- `progression-storage` covers none/valid v1/v2/unreadable/unavailable, migration without a write,
  extra keys, write failure, and clearing only the save key.
- `SkillsScreen` covers missing, v1, positive v2, purchase, max, insufficient points, reset disabled,
  reset confirmation/cancel/success/cap, write failures, keyboard focus, and read-blocked states.
- `SaveGate` behavior is covered through `PlayScreen`: blocked unreadable/unavailable renders, no
  board/HUD, landscape priority, and Retry/Restart redirects.
- `PlayerSquare` covers the level-0 ring absence, ring/digit geometry, 0–3 barrier notches, and the
  barrier-hit outline state.
- `CombatLayer` covers the 6 instant beam + 6 preview + 12 explosion pool, beam/preview transforms,
  explosion shape/timing/reuse, reduced-motion suppression, and clearing; the play integration covers
  right-mouse show/hide, left-click/context-menu behavior, dual-touch roles, level-0 second-touch
  ignore, movement/shield lift order, pause/portrait/death hiding, Retry/Restart shield and barrier
  reset, full ring charge, notch depletion, preview visibility, a reflected-beam charge spend and
  instant beam, and the reduced-motion hit-cue omission.
- `useMouseShield` covers right-button engagement, window tracking, source gating, blur/blocked
  clearing, pointer cancel/document hidden, and context-menu prevention; `useTouchControls` covers
  movement/shield assignment, the 8 px dead zone, third-pointer ignore, movement lift while the shield
  stays latched, shield release, pointer cancel/lost capture/document hidden, mouse ignore, and pause
  clearing. `reflect-shield` domain tests cover full start, one-at-a-time recharge, carried progress,
  spending, ring progress, level 0, and orbit geometry.
- Domain tests cover `player` (barrier), `upgrades` (curves/loadout), `run`, `timeline`, `progression`
  (v1/v2 validation, migration, commit, purchase, reset), `combat` (reflection, instant targeting,
  stop at last hit, previews, deaths, drops, recharge/phase), `enemy-world` (including fires and
  reflection), `enemy-spawn`, `enemy-collision` (including outer-side contact, lane entry, reflection,
  contact ordering), both enemy kinds, RNG, the save envelope, and storage helpers.
