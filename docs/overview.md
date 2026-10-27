# Overview

**react-shapebound** (working title **Shapebound**) is a single-player, offline browser game. It is a
React + TypeScript single-page app built with Vite and React Router. The game is rendered entirely
with HTML and CSS — no canvas, no WebGL, no backend.

## Current status

The project has a **survival run slice**, not a complete game. What exists:

- Five clean routes: title, play, settings, skills, and not-found. `PresentationLayout` renders the
  shared black/acid `SiteHeader` once for the presentation pages; the play screen is outside it and
  headerless.
- A full-viewport, landscape-only play board with a square player, a static outlined player
  container, keyboard movement, and a touch-anchored joystick. The player is confined to the
  container; the screen is not a collision boundary.
- An active-time run: `mm:ss:cc` timer, blue points at one per active second, a 320 px timeline with
  repeating five-minute boss markers, a boss-marker banner, and a stacked freeze set (`pause`,
  `hidden`, `portrait`, `focus`).
- Viewport-space enemy threats: red squares that aim once and travel straight, and orange triangles
  that stop, lock an aim, charge a hatched lane, and fire a hitscan beam once. The enemy layer is a
  fixed 28-node DOM pool.
- A run HUD with timer/points, timeline, legend, boss banner, and pause control; a native pause menu
  with config, restart/back confirmations, and a locked Skill Tree item; and a modal run-over with
  final time/points and the commit outcome.
- A v1 progression record at `shapebound:save`: blue points, best time, run count, and three
  reserved boss currencies. It commits once at death and blocks overwrite on an unreadable record.
  There is no active-run save or resume.
- A read-only `/skills` page showing the saved balance, best time, run count, zero reserved boss
  currency rows, and a locked generic 3 × 3 node map. No spending or upgrades.
- A local settings provider with persisted reduced-motion and glow-intensity preferences. Glow
  intensity controls every in-run surface and the static preview; presentation pages keep fixed
  glows.
- A pure seeded RNG, the generic versioned save envelope, and pure run, timeline, progression, and
  enemy domains.
- A Tailwind v4 design system aligned with the live Cyberpunk 2077 reference: yellow hero, black
  angular panels, acid/cyan/red palette, heavy condensed type.
- Strict TypeScript, ESLint, Prettier, Vitest, and a pre-push quality gate.

The provisional roguelike vision is in `docs/game-design.md`: survival blue points, color-coded
bosses and currencies, and a node tree. Boss entities and fights, boss currency awards, node
spending/upgrades, player attack/combat, a win condition, active-run persistence, audio, and a PWA
are not implemented. Run the `design-a-mechanic` pipeline before writing the next rules.

## How it runs

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build
pnpm preview    # http://localhost:4173
```

There is no server process, database, API, or runtime network call. `dist/` is a static bundle.
`BrowserRouter` gives clean paths; Vite dev/preview provide history fallback. A static host must serve
`index.html` for unknown paths, and a subpath deployment must pair Vite `base` with the router
`basename`.

## Where things live

| Topic                    | Location                                                    |
| ------------------------ | ----------------------------------------------------------- |
| Architecture and rules   | `docs/architecture.md`                                      |
| Palette, type, Tailwind  | `docs/design-system.md`                                     |
| Component inventory      | `docs/components.md`                                        |
| Dependency watchlist     | `docs/dependency-candidates.md`                             |
| Game design skeleton     | `docs/game-design.md`                                       |
| Run, build, troubleshoot | `docs/runbook.md`                                           |
| Deliberate oddities      | `docs/decisions-not-to-fix.md`                              |
| Third-party licenses     | `docs/third-party-licenses.md`                              |
| Why decisions were made  | `decisions/`                                                |
| Agent workflow           | `docs/working-with-agents.md`, `AGENTS.md`, `.ai/README.md` |

## Non-goals

- No backend, accounts, cloud saves, leaderboards, or telemetry.
- No canvas/WebGL renderer.
- No portrait play layout. Presentation pages are responsive; only the game is landscape-only.
- No installable PWA yet. Offline means “no network after assets load”.
- No game mechanics invented before the design pipeline runs.
