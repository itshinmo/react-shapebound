---
description: Commands, approval gate, spec threshold, role handoffs, and handoff checks. Read before starting and before finishing.
last-verified: 2026-10-21
---

# Development workflow memory

## Commands

```sh
pnpm dev        pnpm build      pnpm preview
pnpm lint       pnpm format     pnpm typecheck
pnpm test       pnpm check      pnpm verify
```

`pnpm check` = format:check + lint + typecheck + test + docs:check. `pnpm verify` adds the production
build. The pre-push hook runs `pnpm check`; CI runs check + build.

## Approval gate

Do not stage, commit, or push unless the author explicitly asks. Verify, report, and hand over the
diff. An approval covers the reviewed diff only.

## Before coding

- Routine change → implement directly after reading the relevant docs.
- Architectural/design change → spec in `.ai/specs/`, RFC if real alternatives, author confirms
  before code.
- Gameplay → `design-a-mechanic` (brief → rules → prototype → playtest → promote).
- UI → `design-a-feature` (brief + conformance checklist).
- Ambiguous spec → stop and ask. Do not invent behavior.

## Role handoffs

```text
documenter → game-designer → designer → implementer → author review → reviewer (on request)
```

Reviewer is opt-in and read-only. The author commits.

## Before handoff

1. `pnpm check`; `pnpm build` when app/build/styling changed.
2. Run `knowledge-drift-sync`: update docs in the same change, or report “no drift” with evidence.
3. Report changed files, verification output, open questions, and any unresolved risk.
4. Stop. Do not commit.

## Reminders

- One logical change at a time.
- Never weaken tests or lint to go green.
- No new runtime dependency without an ADR.
- Runtime code never reads `.ai/`.
