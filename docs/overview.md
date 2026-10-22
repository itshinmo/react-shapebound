# Overview

**react-shapebound** (working title **Shapebound**) is a single-player, offline browser game. It is a
React + TypeScript single-page app built with Vite and React Router. The game is rendered entirely
with HTML and CSS — no canvas, no WebGL, no backend.

## Current status

The project is an **architectural scaffold**, not a playable game. What exists:

- Four routes: title, play scaffold, settings, not-found.
- A local settings provider with persisted reduced-motion preference.
- A pure seeded RNG and a versioned, generic save envelope.
- A Tailwind v4 design system aligned with the live Cyberpunk 2077 reference: yellow hero, black
  angular panels, acid/cyan/red palette, heavy condensed type.
- Strict TypeScript, ESLint, Prettier, Vitest, and a pre-push quality gate.

Gameplay rules, win conditions, and content are not defined yet. The play screen explicitly says so.
When the game is described, the `design-a-mechanic` pipeline runs before rules code is written.

## How it runs

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build
pnpm preview    # http://localhost:4173
```

There is no server process, database, API, or runtime network call. `dist/` is a static bundle.
`HashRouter` and `base: './'` mean it can be served from any static path without rewrite rules.

## Where things live

| Topic                    | Location                                                    |
| ------------------------ | ----------------------------------------------------------- |
| Architecture and rules   | `docs/architecture.md`                                      |
| Palette, type, Tailwind  | `docs/design-system.md`                                     |
| Component inventory      | `docs/components.md`                                        |
| Game design skeleton     | `docs/game-design.md`                                       |
| Run, build, troubleshoot | `docs/runbook.md`                                           |
| Deliberate oddities      | `docs/decisions-not-to-fix.md`                              |
| Third-party licenses     | `docs/third-party-licenses.md`                              |
| Why decisions were made  | `decisions/`                                                |
| Agent workflow           | `docs/working-with-agents.md`, `AGENTS.md`, `.ai/README.md` |

## Non-goals

- No backend, accounts, cloud saves, leaderboards, or telemetry.
- No canvas/WebGL renderer.
- No installable PWA yet. Offline means “no network after assets load”.
- No game mechanics invented before the design pipeline runs.
