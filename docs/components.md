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

| Screen           | Path                                          | State / notes                                                                   |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `TitleScreen`    | `src/features/title/title-screen.tsx`         | Yellow hero, entry CTAs (`INITIALIZE`, `SKILL TREE`, `CONFIGURE`), module strip |
| `HeroArt`        | `src/features/title/hero-art.tsx`             | Original abstract SVG hero composition                                          |
| `PlayScreen`     | `src/features/play/play-screen.tsx`           | Full-bleed run board; gate, run loop, HUD, enemies, pause, run-over             |
| `SettingsScreen` | `src/features/settings/settings-screen.tsx`   | Reduced motion; glow intensity + static preview; reset; layout header           |
| `SkillsScreen`   | `src/features/skills/skills-screen.tsx`       | Saved progression read states, locked 3 × 3 map, reserved boss rows; no writes  |
| `NotFoundScreen` | `src/features/not-found/not-found-screen.tsx` | Yellow 404 fallback with glitch display; layout header                          |

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
| `PlayScreen`           | `src/features/play/play-screen.tsx`        | Play gate, board, arena, enemy projection, HUD, overlays                |
| `LandscapeGate`        | `src/features/play/landscape-gate.tsx`     | Portrait overlay over the mounted play surface                          |
| `useLandscape`         | `src/features/play/use-landscape.ts`       | Portrait media-query subscription for the play gate                     |
| `useRunLoop`           | `src/features/play/use-run-loop.ts`        | rAF loop, frame clamp, fixed-step accumulator, freeze listeners, commit |
| `progression-storage`  | `src/features/play/progression-storage.ts` | `readProgression`, `writeProgression`, `clearProgression` port          |
| `run-seed`             | `src/features/play/run-seed.ts`            | App-supplied uint32 run seed                                            |
| `PlayerContainer`      | `src/features/play/player-container.tsx`   | Static outline arena; `glow-arena` follows glow intensity               |
| `PlayerSquare`         | `src/features/play/player-square.tsx`      | Acid square sized from stats; `glow-player`; transform loop             |
| `TouchJoystick`        | `src/features/play/touch-joystick.tsx`     | Visual base and `glow-joystick` knob at the touch anchor                |
| `StartOverlay`         | `src/features/play/start-overlay.tsx`      | Touch-only start, fullscreen, and orientation-lock gesture              |
| `RunHud`               | `src/features/play/run-hud.tsx`            | Overlay HUD; timer/points, timeline, banner, pause control              |
| `RunTimer`             | `src/features/play/run-timer.tsx`          | Imperative `mm:ss:cc` timer and blue-point readout                      |
| `RunTimeline`          | `src/features/play/run-timeline.tsx`       | 320 px track, nodes, legend, hidden accessible list                     |
| `BossBanner`           | `src/features/play/boss-banner.tsx`        | Five-minute boss marker plate; `role="status"`                          |
| `EnemyLayer`           | `src/features/play/enemy-layer.tsx`        | Preallocated 24 body + 2 warning + 2 beam DOM pool                      |
| `PauseMenu`            | `src/features/play/pause-menu.tsx`         | Native modal pause, config, confirmations, locked Skill Tree            |
| `RunOverOverlay`       | `src/features/play/run-over-overlay.tsx`   | Modal death summary, commit states, Retry/leave actions                 |
| `useKeyboardInput`     | `src/features/play/use-keyboard-input.ts`  | WASD/arrows; clears on blur, hidden tab, pause, portrait                |
| `useTouchJoystick`     | `src/features/play/use-touch-joystick.ts`  | Pointer capture, analog vector, imperative knob, hide                   |
| `getJoystickVector`    | `src/features/play/joystick-vector.ts`     | Pure anchor/point → clamped vector and knob offset                      |
| `requestLandscapeLock` | `src/features/play/orientation-lock.ts`    | Guarded fullscreen + landscape lock and cleanup                         |
| `isTouchDevice`        | `src/features/play/is-touch-device.ts`     | Coarse-pointer / `maxTouchPoints` detection                             |

The player rules live in `src/game/player.ts`; the play feature imports them and never duplicates
them. `PLAYER_CONTAINER_SIZE` is the starting arena size and is intended to become a skill-tree
upgrade.

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
without presenting reset as a repair. Retry starts a new run immediately, Open Skill Tree waits for
the commit to settle, Back to title leaves, and Escape does nothing. The run-over never presents a
projected total as banked.

### Skills page

`SkillsScreen` reads progression once on mount through `readProgression`. `none` shows the zero base;
a readable zero balance shows the empty callout with the real best time and run count; a positive
balance shows the saved blue points, best time, run count, and the saved-locally panel; `unreadable`
replaces the balance row with one red panel and a `/settings` route; `unavailable` shows a red panel
without settings repair. The node map is a generic locked 3 × 3 schematic; every node says `LOCKED`
and is not a button or tab stop. The boss currency rows are reserved and zero. The page has no
spending, unlocks, or writes. Its footer shows `START A RUN` only for a readable zero balance; a
positive balance offers `BACK TO TITLE`.

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
- The player, joystick, arena outline, and enemy layer are `aria-hidden` visual representations; the
  domain state is the source of truth. The HUD's hidden timeline list is the accessible equivalent
  of the visible track.
- Glow intensity is mirrored to `--glow-intensity`; every in-run surface and the static preview
  consume it. Presentation pages, the HUD timer/points/legend/scrim, the menu button, pause dialog
  frame/buttons, and all focus rings use fixed or no glows. See
  [ADR-015](../decisions/ADR-015-in-run-glow-scope.md).
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
- `App` covers root, settings, skills, play, and unknown-route rendering with clean URLs.
- `LandscapeGate` and `PlayScreen` cover portrait blocking, the mounted run behind the gate, the
  pause menu, focus freeze, pause/restart/resume, portrait return, and the run-over mount.
- `RunHud` covers the timer, points, timeline geometry/state, hidden list, boss banner, glow tokens,
  and the pause control.
- `EnemyLayer` covers the 24 + 2 + 2 node pool, imperative writes, reuse, and clearing.
- `PauseMenu` covers the rail, config, confirmations, Escape, outside click, locked Skill Tree,
  suspended/restore, and reduced motion.
- `RunOverOverlay` covers saved, pending, failed, unreadable, and unavailable states, the Settings
  route, and the latched retry.
- `useRunLoop` covers frame clamp, remainder, fixed steps, frozen states, portrait return, death,
  single commit, failed retry, and restart.
- `progression-storage` covers none/valid/unreadable/unavailable, extra keys, write failure, and
  clearing only the save key.
- `SkillsScreen` covers missing, zero-balance, positive, unreadable, and unavailable reads, and the
  locked non-interactive map.
- Domain tests cover `player`, `run`, `timeline`, `progression`, `enemy-world`, `enemy-spawn`,
  `enemy-collision`, both enemy kinds, RNG, the save envelope, and storage helpers.
