---
description: What react-shapebound is, the stack, and where project knowledge lives. Read first in every session.
last-verified: 2026-10-21
---

# Overview

**react-shapebound** (working title **Shapebound**) is a single-player, offline browser game. The
game is rendered with HTML and CSS — no canvas, no WebGL, no backend.

- Stack: React 19, TypeScript 6 (strict), Vite 8, React Router 8 (declarative + `HashRouter`),
  Tailwind CSS 4, and bundled OFL fonts (Anton, Chakra Petch, Rajdhani, JetBrains Mono).
- Persistence: `localStorage`, versioned save envelope, local settings.
- Testing: Vitest + Testing Library. Quality gate: ESLint + Prettier + `tsc` + Vitest.
- Current state: architectural scaffold. Routing, settings, RNG, save envelope, and the design
  system exist. Gameplay rules are not designed yet.

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
