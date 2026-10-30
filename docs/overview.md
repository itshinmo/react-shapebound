# Overview

**react-shapebound** (working title **Shapebound**) is a single-player, offline browser game. It is a
React + TypeScript single-page app built with Vite and React Router. The game is rendered entirely
with HTML and CSS — no canvas, no WebGL, no backend.

## Current status

The project has a **survival run slice**, not a complete game. What exists:

- Five routes: title, play, settings, skills, and not-found. `PresentationLayout` renders the
  shared black/acid `SiteHeader` once for the presentation pages; the play screen is outside it and
  headerless.
- A full-viewport, landscape-only play board with a square player, a static outlined player
  container, keyboard movement, and touch movement. The player is confined to the container; the
  screen is not a collision boundary. Right-mouse and dual-touch shield input, a cyan shield line, a
  player-local charge ring, barrier notches, and reflected-path previews are implemented. A warning
  lane that hits the outer shield face before the player reflects as an instant cyan beam, spends a
  charge, and can kill normal enemies; kills play a shape-matched explosion and may drop one barrier
  charge at 5%. Orange triangle body contact also damages.
- An active-time run: `mm:ss:cc` timer, blue points at one per active second, a 320 px timeline with
  repeating five-minute boss markers, a boss-marker banner, and a stacked freeze set (`pause`,
  `hidden`, `portrait`, `focus`).
- Viewport-space enemy threats: red squares that aim once and travel straight, and orange triangles
  that stop, lock an aim, charge a hatched lane, and fire a hitscan beam once. The enemy layer is a
  fixed 48-node DOM pool (36 bodies, 6 warnings, 6 beams); the combat layer adds 6 beam, 6 preview, and
  12 explosion nodes.
- A run HUD with timer/points, timeline, legend, boss banner, and pause control; a native pause menu
  with config, restart/back confirmations, and a locked Skill Tree item; and a modal run-over with
  final time/points and the commit outcome. Retry and Restart re-read the save and show a blocking
  `SaveGate` instead of starting a run when the read is unreadable or unavailable.
- A v2 progression record at `shapebound:save`: blue points, best time, run count, three reserved
  boss currencies, and seven upgrade levels. Valid v1 records are migrated on read with zero upgrades;
  reads never rewrite. The record commits once at death and blocks overwrite on an unreadable record.
  There is no active-run save or resume.
- A captured run loadout from the saved upgrade levels: movement speed, player size, arena size, max
  barrier, reflect charge count/recharge, and pierce. Barrier is implemented in the player domain and
  as top-edge notches (full at run start, consumed before the single health point, no regeneration);
  there is no separate barrier HUD. The reflect charge ring, shield line, one-sided first-contact
  reflection, instant beams, previews, pierce kills, shape-matched explosions, and 5% barrier drops
  are implemented.
- An interactive `/skills` page with the four-branch add-only tree, one-level purchases for one blue
  point, the Reset Skills confirmation and refund, saved balance/best time/run count, and reserved
  boss currency rows. An unreadable save shows a static blocked tree with the `/settings` recovery
  route; unavailable storage shows a static blocked tree with no reset-as-repair route.
- A local settings provider with persisted reduced-motion and glow-intensity preferences. Glow
  intensity controls every in-run surface and the static preview; presentation pages, including
  `/skills`, keep fixed glows.
- A pure seeded RNG, the generic versioned save envelope with a migration hook, and pure run,
  timeline, progression, upgrade/loadout, reflect/combat, and enemy domains.
- A Tailwind v4 design system aligned with the live Cyberpunk 2077 reference: yellow hero, black
  angular panels, acid/cyan/red palette, heavy condensed type.
- Strict TypeScript, ESLint, Prettier, Vitest, and a pre-push quality gate.

The provisional roguelike vision is in `docs/game-design.md`: survival blue points, color-coded
bosses and currencies, and a node tree. Boss entities and fights, boss currency awards, direct player
attack, a win condition, active-run persistence, audio, and a PWA are not implemented. Run the
`design-a-mechanic` pipeline before writing the next rules.

## How it runs

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build
pnpm preview    # http://localhost:4173
```

There is no server process, database, API, or runtime network call. `dist/` is a static bundle.
Routes are clean paths with `BrowserRouter` and a basename derived from `VITE_BASE`; a static host
must serve `index.html` for unknown paths. GitHub Pages cannot return a 200 for a deep link, so the
deploy workflow copies `index.html` to `404.html`; the app boots with an HTTP 404 on the first
request. GitHub Pages deploys the build artifact published on pushes to `main` by
`.github/workflows/deploy.yml`; the workflow also refreshes a `gh-pages` snapshot.

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
