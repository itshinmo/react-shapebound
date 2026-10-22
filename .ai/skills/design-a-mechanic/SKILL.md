---
name: design-a-mechanic
description: Use when the game needs a new or changed gameplay rule, loop, win condition, balance value, or player-facing system. Runs a staged brief → rules → prototype → playtest → promote pipeline and requires author approval between stages.
---

# design-a-mechanic

This is a dispatcher, not a single prompt. Read the mechanic spec's `stage`, confirm the previous
gate, then load exactly one stage file. Do not load or perform later stages early.

## Prerequisites

- `docs/game-design.md` — design pillars and the current mechanic index.
- `docs/architecture.md#game-domain` — what the pure domain layer may do.
- `decisions/ADR-002-dom-only-rendering.md` and `decisions/ADR-003-pure-game-domain.md`.
- `.ai/templates/spec.md` — the base spec shape.
- `AGENTS.md` — approval gate and non-negotiables.

## Workflow

1. Copy `.ai/templates/spec.md` to `.ai/specs/mechanics/<slug>.md` if it does not exist. Add
   frontmatter with `stage`, `status`, `created`, and `related`.
2. Read `stage` from the spec frontmatter. Confirm the previous gate is met. If it is not, stop and
   say exactly what is missing. Do not skip a gate.
3. Load the matching stage file and follow it exactly.
4. At the end of the stage, update the spec frontmatter and hand the artifact to the author.
5. Wait for author approval before moving to the next stage. The author owns the design decision.

## Stage routing

| `stage`     | File                  | Gate to leave the stage                                             |
| ----------- | --------------------- | ------------------------------------------------------------------- |
| `brief`     | `stages/brief.md`     | Brief states experience, problem, constraints, and non-goals        |
| `rules`     | `stages/rules.md`     | Rules spec has state, transitions, invariants, edge cases, criteria |
| `prototype` | `stages/prototype.md` | Author approves the ordered implementation plan                     |
| `playtest`  | `stages/playtest.md`  | Code/tests pass, author has played a build, findings are recorded   |
| `promote`   | `stages/promote.md`   | Durable rules in docs, decision recorded, spec deleted              |

## Constraints

- **No production code before the rules spec is approved.** The `prototype` stage produces a plan;
  `implementer` writes code only after the author confirms it.
- **Do not invent mechanics.** Everything not explicitly requested is a proposal, clearly labeled.
- **No fake precision.** Every balance number is either justified or tagged `[unverified]`.
- **One mechanic per spec.** Split independent mechanics into separate specs.
- **Keep the domain pure.** No React, DOM, storage, timers, `Date.now`, or `Math.random` in
  `src/game` (ADR-003).
- **Respect the DOM constraint.** If a mechanic needs canvas, physics at scale, or thousands of
  animated nodes, stop and write an RFC before proceeding (ADR-002).
- **Never edit the author's design notes in place.** Propose additions in the spec and let the
  author resolve them.

## Useful commands

```sh
pnpm test           # unit tests for the domain
pnpm test:watch     # during prototype work
pnpm check          # full gate before handoff
pnpm dev            # playable local build
```

## Expected output

One stage artifact appended to the mechanic spec, updated frontmatter, and a short handoff naming
the open decisions. No production code during `brief`, `rules`, or `playtest` analysis.

## References

- `.ai/templates/spec.md`
- `docs/game-design.md`
- `.ai/memories/working/README.md` — when the design must survive across sessions
- `.ai/agents/game-designer.md`, `.ai/agents/implementer.md`
