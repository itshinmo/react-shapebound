# Architecture

## Stack

| Area        | Choice                                                           |
| ----------- | ---------------------------------------------------------------- |
| UI          | React 19                                                         |
| Language    | TypeScript 6, strict + `noUncheckedIndexedAccess`                |
| Build       | Vite 8                                                           |
| Routing     | React Router 8, declarative mode, `HashRouter`                   |
| Styling     | Tailwind CSS 4; Cyberpunk-reference palette/composition          |
| Type        | Anton (hero), Chakra Petch (UI), Rajdhani (body), JetBrains Mono |
| State       | Pure game domain + React context for app settings                |
| Persistence | `localStorage`, versioned save envelope                          |
| Tests       | Vitest 5 + Testing Library + jsdom                               |
| Quality     | ESLint 9 (type-aware), Prettier 3, `tsc`, pre-push hook, CI      |
| Package mgr | pnpm 12                                                          |

TypeScript and ESLint majors are pinned for compatibility: `typescript-eslint` 8.72 supports TypeScript
`<6.1`, and `eslint-plugin-jsx-a11y` 6.10 supports ESLint `^9`. Do not bump either alone; run the
full gate and update this table.

## Layers

```text
src/app       composition root: router, shell, providers, error boundary
src/features  screens and feature-owned state (title, play, settings, not-found)
src/game      pure domain: RNG, save envelope, future rules
src/shared    cross-cutting primitives: UI, storage helpers, app constants
src/styles    Tailwind entry, theme tokens, base layer, custom utilities
src/test      Vitest setup and render helper
```

Dependency direction:

```text
app → features → game + shared
shared → nothing upward
game  → no React, DOM, storage, network, timers, Date.now, or Math.random
```

These are enforced in `eslint.config.js` with `import-x/no-restricted-paths` and restricted
imports/globals. The settings provider lives in `src/features/settings/`; `src/app/app.tsx` composes
it around the router. Features must not import the app root.

## Routing

`src/app/app.tsx` uses declarative React Router with `HashRouter`:

| Path        | Screen           | Purpose                                      |
| ----------- | ---------------- | -------------------------------------------- |
| `/`         | `TitleScreen`    | Identity, entry points, system status        |
| `/play`     | `PlayScreen`     | Non-functional board scaffold; rules pending |
| `/settings` | `SettingsScreen` | Local preferences and data reset             |
| `*`         | `NotFoundScreen` | Route fallback                               |

Hash routing is deliberate (ADR-001). It works from any static subpath without a server rewrite.
If clean URLs become a requirement, that is an ADR-level change: switch to `BrowserRouter`, configure
host fallback, and update this doc and the runbook.

`AppShell` renders a skip control, the single `<main id="main-content">`, a scanline overlay, and
moves focus to main on route changes. Screens render sections, not nested `main` elements.

## Settings and local state

- `src/features/settings/settings-storage.ts` owns the key, schema version, load/save/clear, and the
  system reduced-motion query.
- `src/features/settings/settings-provider.tsx` owns React state, persistence, and the
  `data-reduced-motion` attribute on `<html>`.
- `src/features/settings/settings-context.ts` exposes `useSettings`.
- Reset removes the save key, clears the settings key, resets to system defaults, and then the
  persistence effect writes the new defaults. It does not remove unrelated browser keys.

Storage keys:

```text
shapebound:settings   { version: 1, reducedMotion: boolean }
shapebound:save       { schemaVersion: 1, savedAt: ISO string, data: T }
```

Browser storage is wrapped by `src/shared/lib/storage.ts`. Reads and writes are guarded because
storage can be unavailable in private/locked-down contexts. A failed write is reported as `false`,
not thrown.

## Game domain

There is no game state or reducer yet — deliberately. The domain currently provides:

- `src/game/rng.ts` — seeded `mulberry32`; deterministic, non-cryptographic. `next()` returns
  `[0, 1)`, `nextInt(n)` returns an integer in `[0, n)`, `getState()` exposes the cursor for saves.
- `src/game/save.ts` — generic `SaveEnvelope<T>`, `createSave`, `serializeSave`, `parseSave`, and
  typed parse failures (`invalid-json`, `invalid-envelope`, `unsupported-version`, `invalid-data`).

When the game is designed, the rules spec defines the state and transitions. Implement them as pure
functions/reducer actions in `src/game`, with tests. Time, randomness, and persistence are inputs or
ports; the domain never reaches for them.

### Future save migrations

Schema v1 has no migrations. When v2 exists, add an explicit linear migration from v1 → v2, keep the
old fixtures as tests, and document the upgrade path here. Never silently reinterpret old data.

## Rendering constraints

- **DOM only.** No canvas, WebGL, or canvas-backed library. This keeps accessibility, DOM testing,
  text selection, and CSS layout available (ADR-002).
- Animate `transform` and `opacity`, not layout properties. Avoid per-frame React state updates for
  decorative effects; prefer CSS.
- The scanline overlay is decorative and `aria-hidden`. It is pointer-events-none and must never
  intercept input.
- The current board is decorative (`aria-hidden`) and non-functional. Do not present it as gameplay.
- If a mechanic cannot be expressed well in the DOM, stop and write an RFC rather than adding canvas.

## Offline behavior

The app makes no runtime network requests. Fonts are bundled through Fontsource, not fetched from
Google Fonts. There is no service worker yet, so “offline” means the loaded page continues to work
without a connection; it does not yet mean installable or available after a hard reload with no
cache. A PWA layer needs an ADR and an update strategy.

## Quality gates

```sh
pnpm check        # Prettier + ESLint (0 warnings) + tsc + Vitest + Markdown links
pnpm verify       # check + production build
```

- `.githooks/pre-push` runs `pnpm check`. `pnpm install` sets `core.hooksPath` via `prepare`.
- CI (`.github/workflows/ci.yml`) runs `pnpm verify`.
- Boilerplate: tests are colocated, RTL queries prefer roles/labels, and new domain logic needs unit
  tests.

## Testing strategy

- Domain: pure unit tests for RNG determinism/range and save envelope parsing/versioning.
- Storage: fake in-memory storage, failure and malformed-JSON cases.
- UI: component tests for settings persistence and reset confirmation; routing smoke tests for title
  and not-found.
- No E2E browser suite yet. Add Playwright when there is real gameplay to exercise.

## Decisions not to “fix”

See `docs/decisions-not-to-fix.md`. In short: hash URLs, no canvas, no state library yet, Tailwind
instead of CSS Modules, no runtime network, and a pure domain are intentional.

## Adding a module

1. Decide whether it is app composition, a feature, the domain, or a shared primitive.
2. Respect the dependency direction; let ESLint prove it.
3. Add tests at the same time.
4. Update this doc, `docs/components.md`, and the relevant memory if the shape changed.
