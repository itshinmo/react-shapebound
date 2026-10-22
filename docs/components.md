# Components

## Shared primitives

| Component      | Path                              | Purpose                               | Notes                                                       |
| -------------- | --------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `Button`       | `src/shared/ui/button.tsx`        | Action button                         | `primary`, `secondary`, `ghost`, `danger`, `inverse`; md/lg |
| `LinkButton`   | `src/shared/ui/button.tsx`        | Navigation styled as a button         | Uses React Router `Link`; same variants                     |
| `Panel`        | `src/shared/ui/panel.tsx`         | Clipped surface with border treatment | `default`, `acid`, `cyan`, `red` tones                      |
| `SectionLabel` | `src/shared/ui/section-label.tsx` | `/// LABEL` module marker with tail   | Cyan by default; acid/red variants                          |
| `ShapeMark`    | `src/shared/ui/shape-mark.tsx`    | Original geometric identity mark      | Inline SVG, decorative, `aria-hidden`                       |

Variant styles live in `src/shared/ui/button-styles.ts` so the file exports only components. Callers
may pass layout classes through `className`; do not rely on class merging to override a variant.

## App furniture

| Component          | Path                             | Purpose                                                      |
| ------------------ | -------------------------------- | ------------------------------------------------------------ |
| `AppShell`         | `src/app/app-shell.tsx`          | Skip control, single `<main>`, scanline overlay, route focus |
| `AppErrorBoundary` | `src/app/app-error-boundary.tsx` | Recovery screen for render failures                          |
| `App`              | `src/app/app.tsx`                | Providers + `HashRouter` + route table                       |

## Feature screens

| Screen           | Path                                          | State / notes                                               |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `TitleScreen`    | `src/features/title/title-screen.tsx`         | Yellow hero, system status, scaffold notice, module strip   |
| `HeroArt`        | `src/features/title/hero-art.tsx`             | Original abstract SVG hero composition                      |
| `PlayScreen`     | `src/features/play/play-screen.tsx`           | Non-functional board; explicitly labelled as awaiting rules |
| `SettingsScreen` | `src/features/settings/settings-screen.tsx`   | Reduced motion; two-step local-data reset                   |
| `NotFoundScreen` | `src/features/not-found/not-found-screen.tsx` | Yellow 404 fallback with glitch display                     |

Settings state is feature-owned:

| Module         | Path                                          |
| -------------- | --------------------------------------------- |
| context + hook | `src/features/settings/settings-context.ts`   |
| provider       | `src/features/settings/settings-provider.tsx` |
| storage/schema | `src/features/settings/settings-storage.ts`   |
| screen         | `src/features/settings/settings-screen.tsx`   |

## Rules

- `src/shared/**` may not import `src/app`, `src/features`, or `src/game`.
- `src/features/**` may not import `src/app`.
- `src/game/**` may not import React, the DOM, browser storage, or shared UI.
- Feature-specific composition stays in the feature; only reusable primitives move to shared.
- Add a primitive when the second screen needs it, not the first.
- Tests query by role, label, or text. Test IDs are a last resort.
- Use `inverse` buttons on yellow fields; `primary` on black fields.
- Keep reference-derived art original. Do not copy Cyberpunk 2077 assets or proprietary fonts.
- Update this file when the inventory or ownership changes.

## Testing coverage today

- `Button`/`LinkButton` are exercised through the settings and title screens.
- `SettingsScreen` covers persistence and the two-step reset.
- `App` covers root and unknown-route rendering.
- RNG, save envelope, and storage helpers have unit tests.
