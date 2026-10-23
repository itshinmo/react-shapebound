# Shapebound

A single-player, offline browser game built with React, TypeScript, Vite, React Router, and Tailwind
CSS. Rendered entirely with HTML and CSS — no canvas, no backend.

> **Status: first playable movement slice.** Routing, settings persistence, a pure RNG, a versioned
> save envelope, a pure player domain, and the design system are in place. The play screen is a
> landscape-only board with a square player and keyboard/touch movement. Combat, bosses, points, the
> skill tree, and the HUD are not built.

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

- Title, play, settings, and 404 routes.
- Full-viewport play board with a square player, keyboard movement, and a touch-anchored joystick.
- Landscape-only play screen with a rotate gate, plus best-effort fullscreen and orientation lock on
  touch devices. Title and settings pages stay responsive in both orientations.
- Pure player domain: movement, bounds, health-to-shield conversion, and damage order, with tests.
- Reduced-motion setting persisted locally, with a two-step local-data reset.
- Pure seeded RNG and a versioned save envelope with tests.
- Cyberpunk-inspired design system with a responsive shell.
- Strict quality gate and agentic project knowledge in `.ai/`.

## What is next

The provisional game vision is in `docs/game-design.md`. The next slice should design combat,
enemies, and a damage source, then survival scoring, bosses, and the node tree. The HUD is deferred.
Use the `design-a-mechanic` skill before writing rules code.

## Structure

```text
src/app       router, shell, error boundary
src/features  title, play (landscape gate), settings, not-found
src/game      pure RNG, save envelope, and player rules
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
