# Shapebound

A single-player, offline browser game built with React, TypeScript, Vite, React Router, and Tailwind
CSS. Rendered entirely with HTML and CSS — no canvas, no backend.

> **Status: survival run slice.** Routing, settings persistence, a pure RNG, a versioned progression
> save envelope, a pure player/run/timeline/progression/enemy domain, and the design system are in
> place. The play screen is a landscape-only survival board with a square player confined to a static
> outlined container, keyboard/touch movement, a run HUD, enemy threats, pause, and a run-over. A
> read-only `/skills` page shows saved progression and a locked node-map preview. Boss fights, boss
> currency awards, node spending, player attack, a win condition, and active-run persistence are not
> built.

## Stack

- React 19 + TypeScript 6 (strict)
- Vite 8
- React Router 8 (declarative + `BrowserRouter`)
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

- Clean title, play, settings, skills, and 404 routes; a persistent presentation layout owns the
  shared title header, while the play screen stays headerless and full-bleed.
- Full-viewport play board with a square player inside a static outlined container, keyboard
  movement, and a touch-anchored joystick. The player is confined to the container.
- Active-time survival run: `mm:ss:cc` timer, one blue point per active second, a 320 px timeline
  with five-minute boss markers, a boss-marker banner, and a stacked freeze set.
- Viewport-space red square and orange triangle threats, a fixed 20 ms enemy step, a 28-node pooled
  DOM layer, collision/damage, and death.
- Run HUD, native pause menu with config and run-exit confirmations, and a modal run-over with
  `saved`/`pending`/`failed`/`unreadable`/`unavailable` commit states.
- A v1 progression save (blue points, best time, run count, reserved boss currencies) committed once
  at death, plus a read-only `/skills` page with saved values and a locked node-map preview.
- Landscape-only play screen with a portrait freeze gate, plus best-effort fullscreen and orientation
  lock on touch devices. Returning to landscape opens the pause menu; it does not respawn the run.
  Title, settings, and skills pages stay responsive in both orientations.
- Pure player, run, timeline, progression, and enemy domains, with tests. The container size is a
  future skill-tree upgrade.
- Reduced-motion and glow-intensity settings persisted locally, with a two-step local-data reset.
  Glow intensity controls every in-run surface and the static preview.
- Pure seeded RNG and a versioned save envelope with tests.
- Cyberpunk-inspired design system with a responsive shell.
- Strict quality gate and agentic project knowledge in `.ai/`.

## What is next

The provisional game vision is in `docs/game-design.md`. The next slice should design how bosses are
defeated and whether a run can be won, then boss currency awards and node spending. Player attack and
active-run resume are separate scope decisions. Use the `design-a-mechanic` skill before writing
rules code.

## Structure

```text
src/app       router, shell, presentation layout, error boundary
src/features  title, play (run loop + gate), settings, skills, not-found
src/game      pure RNG, save envelope, player, run, timeline, progression, and enemy rules
src/shared    UI primitives, storage, config
src/styles    Tailwind entry and theme tokens
docs/         current behavior, design system, runbook
decisions/    ADRs
rfcs/         proposals
.ai/          agent orientation, roles, skills, memories
```

## Offline and hosting

No runtime network calls; fonts are bundled. `base: './'` keeps asset URLs relative. Routes are clean
paths with `BrowserRouter`; a static host must serve `index.html` for unknown paths. For a subpath
deployment, set Vite `base` and the router `basename` together. Offline currently means “no network
after load”; a PWA is not included. Serve the build over HTTP (`pnpm preview`), not `file://`.

## AI-assisted workflow

Read `AGENTS.md` first. The short version: agents never stage or commit without an explicit request;
verify with `pnpm check`; update docs in the same change. Before proposing or installing a package,
check `docs/dependency-candidates.md` and notify the author; runtime dependencies require an ADR.
See `CONTRIBUTING.md`, `docs/working-with-agents.md`, and `.ai/README.md` for the full workflow.

## License

<!-- TODO: choose a license before distributing the game. -->

Third-party font and library notices are indexed in `docs/third-party-licenses.md`.
