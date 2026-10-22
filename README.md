# Shapebound

A single-player, offline browser game built with React, TypeScript, Vite, React Router, and Tailwind
CSS. Rendered entirely with HTML and CSS — no canvas, no backend.

> **Status: architectural scaffold.** Routing, settings persistence, a pure RNG, a versioned save
> envelope, and the design system are in place. Gameplay rules are not designed yet; the play screen
> is explicitly a non-functional board preview.

## Stack

- React 19 + TypeScript 6 (strict)
- Vite 8
- React Router 8 (declarative + `HashRouter`)
- Tailwind CSS 4 with semantic theme tokens
- Cyberpunk-inspired yellow/black visual system
- Anton / Chakra Petch / Rajdhani / JetBrains Mono, bundled locally with Fontsource
- Vitest + Testing Library
- ESLint 9 + Prettier, pre-push hook and CI

## Quickstart

Requires Node >= 24 and pnpm 12.

```sh
corepack enable
pnpm install
pnpm dev        # http://localhost:5173
```

```sh
pnpm build      # tsc + vite build → dist/
pnpm preview    # http://localhost:4173
pnpm check      # format + lint + typecheck + tests + docs links
pnpm verify     # check + build
```

## What works

- Title, play scaffold, settings, and 404 routes.
- Reduced-motion setting persisted locally, with a two-step local-data reset.
- Pure seeded RNG and a versioned save envelope with tests.
- Cyberpunk-inspired design system with a responsive shell.
- Strict quality gate and agentic project knowledge in `.ai/`.

## What is next

Describe the game. The `design-a-mechanic` skill runs a brief → rules → prototype → playtest →
promote pipeline before rules code is written. `docs/game-design.md` is the skeleton.

## Structure

```text
src/app       router, shell, error boundary
src/features  title, play, settings, not-found
src/game      pure RNG and save envelope
src/shared    UI primitives, storage, config
src/styles    Tailwind entry and theme tokens
docs/         current behavior, design system, runbook
decisions/    ADRs
rfcs/         proposals
.ai/          agent orientation, roles, skills, memories
```

## Offline and hosting

No runtime network calls; fonts are bundled. `base: './'` and hash routing mean `dist/` can be served
from any static path without rewrite rules. Offline currently means “no network after load”; a PWA is
not included. Serve the build over HTTP (`pnpm preview`), not `file://`.

## AI-assisted workflow

Read `AGENTS.md` first. The short version: agents never stage or commit without an explicit request;
verify with `pnpm check`; update docs in the same change. See `CONTRIBUTING.md`,
`docs/working-with-agents.md`, and `.ai/README.md` for the full workflow.

## License

<!-- TODO: choose a license before distributing the game. -->

Third-party font and library notices are indexed in `docs/third-party-licenses.md`.
