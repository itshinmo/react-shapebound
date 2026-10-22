---
name: write-an-rfc
description: Use when a change has real alternatives or needs a durable decision record — routing strategy, state model, save format, dependency policy, rendering constraints, or other hard-to-reverse choices. Routes the work to a spec, RFC, or ADR.
---

# write-an-rfc

## Prerequisites

- `AGENTS.md` — precedence, spec threshold, approval gate.
- `.ai/templates/spec.md`, `.ai/templates/rfc.md`, `.ai/templates/adr.md`.
- `decisions/README.md` — numbering and conventions.
- `rfcs/README.md` — active/archived lifecycle.
- `docs/architecture.md` — current behavior the proposal would change.

## Workflow

1. **Route the change.**
   - Real alternatives and an open choice → **RFC**.
   - A hard-to-reverse choice with no meaningful alternatives (new runtime dependency, rendering
     model change, layer-rule change) → **ADR directly**.
   - One deliverable's implementation plan → **spec** in `.ai/specs/`.
2. **Draft the RFC** in `rfcs/active/RFC-NNN-<kebab>.md` using the next free number. Never reuse a
   number.
3. Write at least two real options with honest pros and cons. Include the option of doing nothing.
4. **One decision per RFC.** Split independent decisions.
5. Add a row to `rfcs/README.md` and set `Status: Draft` → `Proposed` when ready.
6. **The author moves it to `Accepted`.** Do not implement before that.
7. On ship: fold current-state facts into `docs/`, write the ADR, cross-link RFC ↔ ADR, set the RFC
   to `Implemented`, move it to `rfcs/archived/`, and update both indexes.
8. If the author waives the RFC step for a directly made decision, record the waiver and the
   options considered in the ADR.

## Constraints

- **Never invent options or measurements.** Ground the context in files, commands, or observed
  behavior.
- **Never write an RFC as a disguised ADR.** If the decision is already made, say so and write the
  ADR.
- **Never implement before acceptance.** A `Proposed` RFC is not a decision.
- **Never rewrite an accepted ADR.** Supersede it with a new one.
- **No secrets or private hostnames** in proposals.

## Output contract

```md
# RFC-NNN — <title>

- **Status:** Draft | Proposed | Accepted | Implemented | Rejected
- **Date:** YYYY-MM-DD
- **Supersedes:** —
- **Superseded by:** —

## Context

_What forces are at play, with observable evidence._

## Options

### Option A — <name>

- **Pros:** …
- **Cons:** …

### Option B — <name>

- **Pros:** …
- **Cons:** …

## Decision

_The proposed option and reasoning._

## Consequences

_Positive, negative, and follow-up work._
```

## References

- `.ai/templates/rfc.md`, `.ai/templates/adr.md`
- `decisions/README.md`, `rfcs/README.md`
- `AGENTS.md#knowledge-maintenance`
