# AGENTS.md

The only instruction source for AI agents working on **react-shapebound**. Every tool reads this
file; tool folders only point into `.ai/`. Read this first, then follow the links — do not duplicate
their contents here.

## Approval gate — never stage or commit on your own

**Do not run `git add`, `git commit`, or `git push` (or anything that stages, such as `git mv` or
`git rm`) unless the author explicitly asks.** After verifying, stop and hand the diff to the
author. An approval covers the reviewed diff only.

Do not create a GitHub release, deploy, or publish anything unless explicitly asked. There is no
backend; GitHub Pages is deployed by `.github/workflows/deploy.yml`, which also maintains a
`gh-pages` snapshot.

## What this project is

**react-shapebound** (working title: **Shapebound**) is a single-player, offline browser game. It
is a React + TypeScript single-page app built with Vite and React Router. The game is rendered
entirely with HTML and CSS — no canvas, no WebGL, no game engine dependency, no backend. It must
keep working with no network connection after the assets load.

The current build is a **survival run slice**. It has a landscape-only board with a square player
confined to a static outlined container and keyboard/touch movement; a pure run domain (active-time
clock, blue points at one per active second, timeline, five-minute boss markers, freeze set, death,
one commit); viewport-space red square and orange triangle threats; a run HUD, pause menu, and
run-over; a v2 progression save with a linear v1 read migration; a captured run loadout; an
interactive add-only `/skills` tree with Reset Skills; and the reflect shield's input/aim, cyan
shield line, charge ring, barrier notches, beam reflection, instant reflected beams, reflected-path
previews, explosions, and the 5% barrier drop. Reflected beams can kill normal enemies. A new run
(initial, Retry, Restart) requires a `none` or `valid` save and shows a blocking save gate otherwise.
The container is the collision boundary; the screen is not. The player domain has a barrier buffer
shown by player-local notches. Orange triangle body contact also damages the player. Boss entities
and fights, boss currency awards, direct player attack, and a win condition are not implemented. Do
not invent those mechanics. Use the `design-a-mechanic` skill before writing the next rules code.

## Commands

```sh
pnpm install        # install dependencies (also installs the git hook)
pnpm dev            # local dev server on http://localhost:5173
pnpm build          # typecheck + production build into dist/
pnpm preview        # preview the production build on http://localhost:4173
pnpm lint           # ESLint, zero warnings tolerated
pnpm lint:fix       # ESLint with fixes
pnpm format         # Prettier write
pnpm format:check   # Prettier check
pnpm typecheck      # tsc --build
pnpm test           # Vitest run
pnpm test:watch     # Vitest watch mode
pnpm check          # format:check + lint + typecheck + test + docs:check
pnpm verify         # check + build
```

Always use these commands. Do not invent alternatives, add `npm`/`yarn` lockfiles, or introduce
flags that are not documented here.

## Architecture in three lines

```text
src/app       composition root: router, shell, presentation layout, providers, error boundary
src/features  screens and feature-owned state (title, play, settings, skills, not-found; play owns the run loop and gate)
src/game      pure domain: RNG, save envelope, player, run, timeline, progression, upgrades, enemy rules
src/shared    cross-cutting primitives: UI, storage helpers, app constants
```

Dependency direction is `app → features → game + shared`. `shared` imports nothing upward. `game`
imports no React, DOM, browser storage, timers, `Date.now`, or `Math.random`. The boundary is
enforced by `eslint.config.js`, not just by this paragraph.

## Where things live

| Topic                               | Location                       |
| ----------------------------------- | ------------------------------ |
| Current behavior, rules, procedures | `docs/`                        |
| Why a decision was made (ADRs)      | `decisions/`                   |
| Proposals not yet accepted          | `rfcs/`                        |
| Agent orientation, skills, roles    | `.ai/`                         |
| Local task specs (gitignored)       | `.ai/specs/`                   |
| In-flight context that must survive | `.ai/memories/working/`        |
| Repeatable workflows                | `.ai/skills/`                  |
| Role definitions                    | `.ai/agents/`                  |
| Templates for the above             | `.ai/templates/`               |
| Human onboarding                    | `README.md`, `CONTRIBUTING.md` |

Project knowledge never lives only in `.ai/`. Runtime code never reads `.ai/`. If every AI tool and
the `.ai/` directory were deleted, the app, the docs, and every decision must still stand on its
own.

## Precedence

When sources disagree, trust them in this order (highest first):

1. The author's explicit instructions.
2. Code and config.
3. `docs/`.
4. `decisions/` (accepted ADRs).
5. Accepted `rfcs/`.
6. `.ai/memories/`.
7. `.ai/memories/working/`.
8. Your assumptions.

Fix or flag the lower source and say so. Never silently pick one. An RFC that is not `Accepted`
never overrides accepted knowledge.

## Spec-driven development

For an **architectural or design change** — module boundaries, state shape, save format,
routing strategy, cross-cutting patterns, major dependencies, or a choice with real trade-offs:

1. Write a spec from `.ai/templates/spec.md` into `.ai/specs/` (local, gitignored).
2. Ask about anything ambiguous.
3. Write an RFC from `.ai/templates/rfc.md` if there are real alternatives.
4. Break it into ordered tasks.
5. **Confirm with the author before writing code.**

Routine implementation, small changes, bug fixes, styling adjustments, and test additions need no
spec. When in doubt, ask. Gameplay design runs through `design-a-mechanic`; UI work runs through
`design-a-feature`.

## Knowledge maintenance

This table converts "keep the docs updated" into a lookup. If you change something in the left
column, review the right column **in the same change**.

| If you change…                                 | Review…                                                                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes, screens, or navigation                 | `docs/architecture.md#routing`, `docs/components.md`, `.ai/memories/architecture.md`                                                                                          |
| game rules, state shape, or reducer actions    | `docs/architecture.md#game-domain`, `docs/game-design.md`, `decisions/ADR-003`, `decisions/ADR-011`, `decisions/ADR-012`, `decisions/ADR-013`, game tests                     |
| save schema, migrations, or storage keys       | `docs/architecture.md#settings-and-local-state`, `docs/architecture.md#future-save-migrations`, `docs/runbook.md#save-recovery`, `decisions/ADR-011`, `src/game/save.test.ts` |
| colors, type, spacing, motion, or utilities    | `docs/design-system.md`, `src/styles/global.css`, `decisions/ADR-014`, `decisions/ADR-015`, `.ai/memories/conventions.md`                                                     |
| a dependency                                   | `docs/dependency-candidates.md`; an ADR for runtime `dependencies`; `README.md` stack; `AGENTS.md` commands                                                                   |
| scripts, commands, or build config             | `AGENTS.md`, `README.md`, `docs/runbook.md`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`                                                                       |
| ESLint, TypeScript, Prettier, or Vitest config | `docs/architecture.md#quality-gates`, `.ai/memories/conventions.md`                                                                                                           |
| layer boundaries or import rules               | `eslint.config.js`, `docs/architecture.md#layers`, `.ai/memories/architecture.md`                                                                                             |
| agent, skill, or template                      | `.ai/README.md`, `CONTRIBUTING.md`                                                                                                                                            |
| title, tagline, or version                     | `src/shared/config/app-config.ts`, `index.html`, `README.md`                                                                                                                  |
| deployment or static hosting                   | `docs/runbook.md`, `README.md`, `.github/workflows/deploy.yml`, `decisions/ADR-016-github-pages-deployment.md`                                                                |
| accessibility behavior                         | `docs/design-system.md#accessibility`, the non-negotiables below                                                                                                              |

## Non-negotiables

### Code

- **DOM only.** Never add `<canvas>`, WebGL, or a canvas-backed rendering library. The rule exists
  for accessibility, inspectability, DOM testing, and CSS layout (ADR-002).
- **`src/game` is pure.** No React, DOM, storage, network, timers, `Date.now`, or `Math.random`.
  Pass seeds and timestamps in; all randomness goes through `src/game/rng.ts` (ADR-003).
- **No runtime network calls.** The game is offline after load. No backend, analytics, remote
  fonts, or runtime data fetching (ADR-001).
- **No new runtime dependency without an ADR.** Prefer zero. Dev dependencies do not need an ADR,
  but explain why they are needed in the change summary.
- **Check before adding any dependency.** Read `docs/dependency-candidates.md` first. If a task
  could benefit from a listed candidate or a new package, stop and notify the author with the
  problem, the candidate, the current alternative, whether it is runtime or dev, and the estimated
  cost. Do not install it without explicit approval; runtime dependencies still need an ADR.
- **No barrel files.** Import from the concrete module. No `index.ts` re-export layers.
- **No CSS Modules, CSS-in-JS, or global stylesheet growth.** Style with Tailwind utilities and the
  semantic theme tokens in `src/styles/global.css`. No inline hex/rgb values. Arbitrary values need
  a reason. `@apply` is reserved for base styles.
- **Files are kebab-case.** Components and types are PascalCase. Hooks are `use-something.ts` and
  export `useSomething`. Tests sit beside the code as `*.test.ts` / `*.test.tsx`.
- **No comments that narrate code.** A comment is allowed only for a non-obvious constraint. Use
  `<!-- TODO -->` in docs and `[unverified]` for unverified claims.

### Design

- Every screen must be usable with a keyboard, have a visible focus state, and respect
  `prefers-reduced-motion` and the in-app reduced-motion setting. The reduce-motion switch thumb is
  the sole exception to the global transition disable: its 150ms position change is the control's
  state feedback, documented in `docs/design-system.md`.
- The play surface is landscape-only and full-bleed and `/play` stays headerless. The run HUD is an
  overlay with no reserved band; do not add a portrait play layout, a header, or a presentation-page
  HUD. The title, settings, skills, and other presentation pages stay responsive in both orientations
  and use the shared `SiteHeader` rendered once by `PresentationLayout`; `/play` is outside that
  layout. Classify a new in-run surface against `docs/design-system.md` and ADR-015 before styling it.
- Glow intensity controls every in-run surface: player, arena, joystick, enemy bodies, warning
  lanes/beams, timeline track and future/current nodes, boss banner, pause connector, run-over
  panel, shield line, instant reflected beams, reflected-path previews, explosions, and the static
  preview. Use `glow-player`, `glow-arena`, `glow-joystick`, `glow-enemy`, `glow-warning`,
  `glow-track`, `glow-hud`, and `glow-danger`. The charge ring and barrier notches have no independent
  glow. Presentation pages,
  timer/points/legend/scrim, the menu button, pause dialog frame/buttons, and all focus rings stay
  fixed or unglowed. Never add `shadow-glow-track` or a fixed ambient glow to an in-run surface.
- Clipped surfaces use `clip-border` with `--clip-border` and `--clip-fill`, never `border-*` or
  `bg-*`. The element background is the border; an inset `::before` paints the fill with `clip-path:
inherit`. This is the canonical border treatment for buttons, panels, the site header, the title
  art panel, and the skip link. All button variants need hover, active, and visible focus states.
- Use semantic HTML first: `button` for actions, `a`/`Link` for navigation, headings in order,
  labels for inputs. Do not put click handlers on plain `div`s.
- Use the semantic color tokens (`void`, `panel`, `paper`, `ink`, `ink-inverse`, `muted`, `acid`,
  `cyan`, `red`, `orange`, `survival`, `boss-purple`, `boss-green`, `boss-orange`, `track`) rather
  than raw palette values. `survival` is blue-point currency; `boss-*` are boss identity only;
  `orange` remains the triangle threat; `track` is timeline structure only. The acid/cyan/red triad
  remains the identity; do not introduce a new accent without a design note or ADR.
- The visual system follows `docs/design-system.md` and `decisions/ADR-006`. Use `font-hero` (Anton)
  only for oversized display, `font-display` for UI headings/buttons, `font-body` for copy, and
  `font-mono` for HUD labels. Use `ink-inverse` on yellow and `ink` on black.
- Keep the cyberpunk language purposeful: clipped corners, thin rules, mono labels, scanlines,
  restrained glow. Do not add decorative noise that obscures content or harms contrast.
- New shared UI primitives go in `src/shared/ui/`; feature-specific composition stays in the
  feature. Update `docs/components.md` when the inventory changes.

### Process and safety

- **Never weaken a test or lint rule to go green.** A suppression needs the specific rule and a
  reason. If a rule is wrong, change it deliberately and document why.
- **Never hand-edit generated output:** `dist/`, `coverage/`, or `pnpm-lock.yaml`. Use the package
  manager for the lockfile.
- **Never commit secrets, tokens, credentials, API keys, or private hostnames.** There are no
  secrets in this project.
- **One logical change at a time.** Do not bundle unrelated refactors into a feature change.
- **Do not invent commands, numbers, sources, or decisions.** Unknowns become a question, a
  `<!-- TODO -->`, or an `[unverified]` flag.
- **Do not add a service worker or PWA layer without an ADR.** Offline currently means "no network
  after assets load", not installability.

## Before you finish

1. Run `pnpm check`. If the app, build config, or styling changed, run `pnpm build` too.
2. Update the doc that the change contradicts, in the same change. Use the maintenance table.
3. If a decision was made, add an ADR in `decisions/`.
4. Run the drift check from `.ai/skills/knowledge-drift-sync/SKILL.md` and report evidence.
5. Report: files changed, what was verified, anything you could not verify, and any open decisions.
6. Stop. Do not stage or commit.

## References

- `.ai/README.md` — map, placement rules, precedence, workflow.
- `docs/architecture.md` — layers, routing, game domain, persistence, quality gates.
- `docs/dependency-candidates.md` — dependency watchlist, triggers, costs, and the notify-first protocol.
- `docs/design-system.md` — palette, typography, Tailwind conventions, accessibility.
- `docs/working-with-agents.md` — how the roles, skills, invocation, and approval gates work.
- `decisions/README.md` — ADR conventions and index.
- `.ai/skills/design-a-mechanic/SKILL.md` — gameplay design pipeline.
- `.ai/skills/design-a-feature/SKILL.md` — UI brief and conformance checklist.
- `.ai/skills/knowledge-drift-sync/SKILL.md` — pre-handoff drift procedure.
