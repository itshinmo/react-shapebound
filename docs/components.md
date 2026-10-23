# Components

## Shared primitives

| Component      | Path                              | Purpose                                | Notes                                                       |
| -------------- | --------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `Button`       | `src/shared/ui/button.tsx`        | Action button                          | `primary`, `secondary`, `ghost`, `danger`, `inverse`; md/lg |
| `LinkButton`   | `src/shared/ui/button.tsx`        | Navigation styled as a button          | Uses React Router `Link`; same variants                     |
| `Panel`        | `src/shared/ui/panel.tsx`         | Clipped surface with outline treatment | `default`, `acid`, `cyan`, `red` tones                      |
| `SiteHeader`   | `src/shared/ui/site-header.tsx`   | Shared black/acid presentation header  | Rendered by `PresentationLayout`; never used on `/play`     |
| `SectionLabel` | `src/shared/ui/section-label.tsx` | `/// LABEL` module marker with tail    | Cyan by default; acid/red variants                          |
| `ShapeMark`    | `src/shared/ui/shape-mark.tsx`    | Original geometric identity mark       | Inline SVG, decorative, `aria-hidden`                       |

Variant styles live in `src/shared/ui/button-styles.ts` so the file exports only components. Callers
may pass layout classes through `className`; do not rely on class merging to override a variant.

## App furniture

| Component            | Path                              | Purpose                                                      |
| -------------------- | --------------------------------- | ------------------------------------------------------------ |
| `AppShell`           | `src/app/app-shell.tsx`           | Skip control, single `<main>`, scanline overlay, route focus |
| `PresentationLayout` | `src/app/presentation-layout.tsx` | Persistent `SiteHeader`, route field, page backgrounds       |
| `AppErrorBoundary`   | `src/app/app-error-boundary.tsx`  | Recovery screen for render failures                          |
| `App`                | `src/app/app.tsx`                 | Providers + `BrowserRouter` + layout routes                  |

The global scanline overlay is hidden on `/play`. The landscape gate is feature-owned by the play
screen, so the title, settings, and not-found routes stay responsive.

## Feature screens

| Screen           | Path                                          | State / notes                                                         |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `TitleScreen`    | `src/features/title/title-screen.tsx`         | Yellow hero with glitching SHAPE, notice, module strip; layout header |
| `HeroArt`        | `src/features/title/hero-art.tsx`             | Original abstract SVG hero composition                                |
| `PlayScreen`     | `src/features/play/play-screen.tsx`           | Full-bleed movement board; no header/HUD; keyboard + touch            |
| `SettingsScreen` | `src/features/settings/settings-screen.tsx`   | Reduced motion; glow intensity + static preview; reset; layout header |
| `GlowPreview`    | `src/features/settings/glow-preview.tsx`      | Static half-scale arena/player preview; visual only                   |
| `NotFoundScreen` | `src/features/not-found/not-found-screen.tsx` | Yellow 404 fallback with glitch display; layout header                |

Settings state is feature-owned:

| Module         | Path                                          |
| -------------- | --------------------------------------------- |
| context + hook | `src/features/settings/settings-context.ts`   |
| provider       | `src/features/settings/settings-provider.tsx` |
| storage/schema | `src/features/settings/settings-storage.ts`   |
| screen         | `src/features/settings/settings-screen.tsx`   |

Play state and integration are feature-owned:

| Module                 | Path                                      | Purpose                                                     |
| ---------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `PlayScreen`           | `src/features/play/play-screen.tsx`       | Play gate, full-bleed board, safe-area playfield            |
| `LandscapeGate`        | `src/features/play/landscape-gate.tsx`    | Blocks only the play surface in portrait                    |
| `useLandscape`         | `src/features/play/use-landscape.ts`      | Portrait media-query subscription for the play gate         |
| `PlayerContainer`      | `src/features/play/player-container.tsx`  | Static outline arena; `glow-arena` follows glow intensity   |
| `PlayerSquare`         | `src/features/play/player-square.tsx`     | Acid square sized from stats; `glow-player`; transform loop |
| `TouchJoystick`        | `src/features/play/touch-joystick.tsx`    | Visual base and `glow-joystick` knob at the touch anchor    |
| `StartOverlay`         | `src/features/play/start-overlay.tsx`     | Touch-only start, fullscreen, and orientation-lock gesture  |
| `useKeyboardInput`     | `src/features/play/use-keyboard-input.ts` | WASD/arrows; clears on blur and hidden tab                  |
| `usePlayerLoop`        | `src/features/play/use-player-loop.ts`    | rAF loop, dt clamp, container bounds, transform writes      |
| `useTouchJoystick`     | `src/features/play/use-touch-joystick.ts` | Pointer capture, analog vector, imperative knob, hide       |
| `getJoystickVector`    | `src/features/play/joystick-vector.ts`    | Pure anchor/point → clamped vector and knob offset          |
| `requestLandscapeLock` | `src/features/play/orientation-lock.ts`   | Guarded fullscreen + landscape lock and cleanup             |
| `isTouchDevice`        | `src/features/play/is-touch-device.ts`    | Coarse-pointer / `maxTouchPoints` detection                 |

The player rules live in `src/game/player.ts`; the play feature imports them and never duplicates
them. `PLAYER_CONTAINER_SIZE` is the starting arena size and is intended to become a skill-tree
upgrade.

## Rules

- `src/shared/**` may not import `src/app`, `src/features`, or `src/game`.
- `src/features/**` may not import `src/app`.
- `src/game/**` may not import React, the DOM, browser storage, or shared UI.
- The play surface is landscape-only and full-bleed. Do not add a portrait play layout, header, or
  HUD without a design pass. Presentation pages stay responsive.
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
- The player and joystick are `aria-hidden` visual representations; the domain state is the source of
  truth.
- Glow intensity is mirrored to `--glow-intensity`; only the play glow utilities and the static
  settings preview consume it. Interface glows use the fixed `shadow-glow-*` tokens and must not
  react.
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

- `Button`/`LinkButton` are exercised through the settings and title screens.
- `SiteHeader` is exercised through the title, settings, and not-found routes.
- `PresentationLayout` is exercised through the title, settings, and not-found routes; the play
  route is verified to render outside it.
- `SettingsScreen` covers reduced-motion and glow-intensity persistence, the static preview, and the
  two-step reset.
- `settings-storage` covers v1 → v2 migration, glow normalization, malformed-record fallback, and
  save output.
- `App` covers root, settings, play, and unknown-route rendering with clean URLs.
- `LandscapeGate` covers portrait blocking and landscape rendering.
- `PlayScreen` covers the no-header/no-HUD desktop surface, the touch start overlay, and the
  portrait gate integration.
- `player` covers spawn, movement, container bounds, health-to-shield, and damage order.
- `joystick-vector`, RNG, save envelope, and storage helpers have unit tests.
