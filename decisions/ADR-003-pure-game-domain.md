# ADR-003 — Pure game domain, seeded RNG, versioned local saves

- **Status:** Accepted
- **Date:** 2026-10-21
- **Topic:** game domain / persistence
- **RFC:** —

## Context

Game rules must be testable without a browser, deterministic for replays and debugging, and safe to
evolve as the design changes. There is no backend and no cloud save. The game must work offline and
survive reloads through local storage. The game design is not finalized yet, so the domain must be
easy to shape without committing to a large state library.

## Decision

- Keep the **game domain in `src/game`** as pure TypeScript. No React, DOM, storage, network, timers,
  `Date.now`, or `Math.random`.
- Use a **seeded `mulberry32` RNG** (`src/game/rng.ts`). Randomness is an explicit input; the seed and
  cursor are part of the save.
- Use a **generic save envelope** (`src/game/save.ts`) with `schemaVersion`, `savedAt`, and `data`.
  Parsing returns typed failures instead of throwing.
- Persist through a small **storage adapter** (`src/shared/lib/storage.ts`) so browser storage can be
  unavailable or replaced later. Keys are `shapebound:save` and `shapebound:settings`.
- Use **React context + reducer/state** at the feature boundary, not a state-management library, until
  a measured need appears.

There is no game state yet. The first rules spec defines it; these contracts are the rails.

## Options considered

- **Zustand/Redux/Jotai** — convenient global state and devtools. Con: adds a runtime dependency and
  couples the domain to a store before the domain shape exists.
- **XState** — explicit state machines and visualization. Con: extra vocabulary/dependency; a
  discriminated-union reducer with exhaustive switches covers the current scale.
- **Class-based engine** — familiar game loop. Con: harder to serialize/test; encourages hidden state.
- **Pure reducer/functions (chosen)** — deterministic, serializable, easy to unit test.
- **Zod for save validation** — robust schema parsing. Con: runtime dependency; hand-written guards
  are sufficient for v1. Revisit if schemas grow.
- **IndexedDB** — larger saves. Con: async complexity not needed yet; localStorage is enough until a
  save-size problem is measured.

## Rationale

The domain is the part most likely to change while the game is designed. Keeping it pure makes change
cheap and tests fast. A seeded RNG gives reproducible runs and reliable tests. A generic versioned
envelope means the first real save schema can be added without re-architecting persistence. Avoiding a
state library keeps the runtime dependency list honest.

## Consequences

- Some reducer/action boilerplate; exhaustive switch checks are enforced by ESLint.
- No Redux devtools initially. Add instrumentation deliberately if needed.
- Save v1 has no migrations. When v2 exists, add a linear migration, keep v1 fixtures, and document it
  in `docs/architecture.md#future-save-migrations`.
- A new runtime dependency, including a schema library or state library, needs a new ADR.
- Time and randomness must be passed in; code that reaches for the clock or `Math.random` fails lint.
- The app layer owns storage, DOM, and timers; the domain owns rules only.

See `docs/architecture.md#game-domain`, `docs/architecture.md#settings-and-local-state`.
