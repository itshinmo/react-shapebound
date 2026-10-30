# Shapebound

A single-player, offline browser game built with React, TypeScript, Vite, React Router, and Tailwind
CSS. Rendered entirely with HTML and CSS — no canvas, no backend.

> **Status: survival run slice.** Routing, settings persistence, a pure RNG, a versioned v2
> progression save with a v1 read migration, a pure player/run/timeline/progression/upgrade/enemy/
> combat domain, and the design system are in place. The play screen is a landscape-only survival
> board with a square player confined to a static outlined container, keyboard/touch movement,
> right-mouse and dual-touch shield input, a shield line, a charge ring, barrier notches, instant
> reflected beams that kill normal enemies, reflected-path previews, explosions, the 5% barrier drop,
> a run HUD, enemy threats, pause, and a run-over; a new run requires a readable save. `/skills` is an
> interactive add-only tree with Reset Skills. Boss fights, boss currency awards, direct player attack,
> a win condition, and active-run persistence are not built.

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
  movement, and touch movement. The player is confined to the container. Right-mouse and dual-touch
  shield input, a cyan shield line, a player-local charge ring, and top-edge barrier notches are
  implemented. A warning lane that hits the outer shield face before the player can be reflected as an
  instant cyan beam; it spends one charge and can kill normal enemies. Preview lanes show where each
  reflecting warning will go. Kills play a shape-matched explosion and may drop one barrier charge at
  5%. Orange triangle body contact also damages the player.
- Active-time survival run: `mm:ss:cc` timer, one blue point per active second, a 320 px timeline
  with five-minute boss markers, a boss-marker banner, and a stacked freeze set.
- Viewport-space red square and orange triangle threats, a fixed 20 ms enemy step, a 48-node enemy
  layer (36 bodies, 6 warnings, 6 beams), and a 25-node combat layer (shield, 6 instant beams,
  6 previews, 12 explosions), collision/damage, reflected kills, and death.
- Run HUD, native pause menu with config and run-exit confirmations, and a modal run-over with
  `saved`/`pending`/`failed`/`unreadable`/`unavailable` commit states.
- A v2 progression save (blue points, best time, run count, reserved boss currencies, seven upgrade
  levels) committed once at death, readable v1 records, and a captured per-run loadout. The
  interactive `/skills` tree buys one level per blue point and resets all seven levels with a
  refund after confirmation.
- Landscape-only play screen with a portrait freeze gate, plus best-effort fullscreen and orientation
  lock on touch devices. Returning to landscape opens the pause menu; it does not respawn the run.
  Title, settings, and skills pages stay responsive in both orientations.
- Pure player, run, timeline, progression, upgrade/loadout, reflect charge/geometry, combat, and
  enemy domains, with tests. Player size and arena size come from the saved upgrade levels.
- Reduced-motion and glow-intensity settings persisted locally, with a two-step local-data reset.
  Glow intensity controls every in-run surface and the static preview.
- Pure seeded RNG and a versioned save envelope with tests.
- Cyberpunk-inspired design system with a responsive shell.
- Strict quality gate and agentic project knowledge in `.ai/`.

## What is next

The provisional game vision is in `docs/game-design.md`. The next design problem is how bosses are
defeated and whether a run can be won. Boss currency awards, direct player attack, and active-run
resume are separate scope decisions. Use the `design-a-mechanic` skill before writing rules code.

## Structure

```text
src/app       router, shell, presentation layout, error boundary
src/features  title, play (run loop + save gate), settings, skills, not-found
src/game      pure RNG, save envelope, player, run, timeline, progression, upgrades, reflect shield, combat, and enemy rules
src/shared    UI primitives, storage, config
src/styles    Tailwind entry and theme tokens
docs/         current behavior, design system, runbook
decisions/    ADRs
rfcs/         proposals
.ai/          agent orientation, roles, skills, memories
```

## Offline and hosting

No runtime network calls; fonts are bundled. Routes are clean paths with `BrowserRouter`; the router
`basename` and Vite `base` both come from `VITE_BASE`, which is `/` locally and
`/react-shapebound/` in the deploy build. A static host must serve `index.html` for unknown paths;
GitHub Pages cannot return a 200 for a deep link, so the deploy workflow copies `index.html` to
`404.html`. The app still boots, but the first request is HTTP 404. The production build is deployed
to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` (and manual dispatch from
`main`). The workflow uploads the Pages artifact and also force-pushes a fresh `gh-pages` snapshot;
set the Pages source to **GitHub Actions** once. The site is
<https://itshinmo.github.io/react-shapebound/>. Offline currently means “no network after load”; a
PWA is not included. Serve the build over HTTP (`pnpm preview`), not `file://`.

## AI-assisted workflow

Read `AGENTS.md` first. The short version: agents never stage or commit without an explicit request;
verify with `pnpm check`; update docs in the same change. Before proposing or installing a package,
check `docs/dependency-candidates.md` and notify the author; runtime dependencies require an ADR.
See `CONTRIBUTING.md`, `docs/working-with-agents.md`, and `.ai/README.md` for the full workflow.

## License

<!-- TODO: choose a license before distributing the game. -->

Third-party font and library notices are indexed in `docs/third-party-licenses.md`.
