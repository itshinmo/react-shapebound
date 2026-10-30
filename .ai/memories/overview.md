---
description: What react-shapebound is, the stack, current slice, and where project knowledge lives. Read first in every session.
last-verified: 2026-10-30
---

# Overview

**react-shapebound** (working title **Shapebound**) is a single-player, offline browser game. The
game is rendered with HTML and CSS — no canvas, no WebGL, no backend.

- Stack: React 19, TypeScript 6 (strict), Vite 8, React Router 8 (declarative + `BrowserRouter`),
  Tailwind CSS 4, and bundled OFL fonts (Anton, Chakra Petch, Rajdhani, JetBrains Mono).
- Persistence: `localStorage`. Settings v2 holds reduced motion and glow intensity. The v2
  `shapebound:save` record holds blue points, best time, run count, three reserved boss currencies,
  and seven upgrade levels, committed once at death; valid v1 records migrate on read with zero
  upgrades. There is no active-run save.
- Testing: Vitest + Testing Library. Quality gate: ESLint + Prettier + `tsc` + Vitest + docs links.
- Current state: **survival run slice**. Five routes (`/`, `/play`, `/settings`, `/skills`, `*`).
  `/play` is landscape-only: a square player in a static outlined container, a run HUD and timeline,
  red-square and orange-triangle threats, pause, death, and a run-over; a new run requires a readable
  save and otherwise shows a blocking save gate. `/skills` is an interactive add-only tree with
  one-point purchases and Reset Skills. Right-mouse/dual-touch shield input, the cyan shield line,
  the charge ring, barrier notches, beam reflection, instant reflected beams, preview lanes, pierce
  kills, shape-matched explosions, and the 5% barrier drop are implemented. Triangle body contact also
  damages. Boss fights/currencies, direct player attack, a win condition, and active-run persistence
  are not. The provisional vision is in `docs/game-design.md`.

## Where knowledge lives

| Need                       | Read                         |
| -------------------------- | ---------------------------- |
| How it works now           | `docs/architecture.md`       |
| Visual language and tokens | `docs/design-system.md`      |
| Component inventory        | `docs/components.md`         |
| Game design skeleton       | `docs/game-design.md`        |
| Run/build/troubleshoot     | `docs/runbook.md`            |
| Why decisions were made    | `decisions/`                 |
| Agent workflow and roles   | `.ai/README.md`, `AGENTS.md` |
| Commands and guardrails    | `AGENTS.md`                  |

## First reads

1. `AGENTS.md`
2. `.ai/memories/architecture.md`
3. `docs/architecture.md`

Runtime code never reads `.ai/`. If a fact is needed to run the app, it belongs in `docs/`.
