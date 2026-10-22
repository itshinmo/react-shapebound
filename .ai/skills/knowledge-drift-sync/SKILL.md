---
name: knowledge-drift-sync
description: Use before handoff, after a behavior or structure change, or whenever code and docs may disagree. Reconciles docs, ADRs, RFCs, memories, and links, and reports evidence rather than a feeling.
---

# knowledge-drift-sync

Drift is the silent killer: the code says one thing, the docs say another, and the next agent
trusts whichever it read last. This skill turns “keep docs updated” into an executable check.

## Prerequisites

- `AGENTS.md#knowledge-maintenance` — the if-you-change-X-review-Y table.
- The current diff (`git diff`, `git diff --staged`, or the change summary).
- `docs/`, `decisions/`, `rfcs/`, `.ai/memories/`.

## Workflow

1. **List what changed** in behavior, structure, configuration, or process. Be concrete.
2. For each item, find its canonical home in the maintenance table and compare:
   - code changed behavior → update the doc in the same change;
   - a doc changed → the code implements it, or revert the doc change;
   - a lint/TypeScript rule changed → config and docs agree.
3. **Decisions:** shipped RFC → ADR, `Implemented`, moved to `archived/`, indexes updated. New
   runtime dependency → ADR.
4. **Memories:** update `last-verified` and fix or delete stale statements. Memories are present
   tense, not history.
5. **Working memories:** resolve the ones tied to this change — promote the durable parts, then
   delete the file.
6. **Links:** every relative link in changed `*.md` files resolves. Check anchors when the target
   has headings.
7. **Report what was synchronized, or state “no drift” with evidence.** “Looks fine” is not
   evidence.

## What counts as evidence

- The list of changed behavior and the doc section that now covers each one.
- The exact files updated.
- The command output proving the build/tests still pass.
- For “no drift”: the inspected diff and the reason no documented behavior changed.

## Constraints

- **Update docs in the same change, not “later”.**
- **Fix or flag the lower source and say so.** Never silently pick between code and docs.
- **Do not rewrite an accepted ADR.** Supersede it.
- **Do not invent a decision** to close a documentation gap. Ask.
- **Do not commit.** Hand the report and diff to the author.

## Output contract

```text
DRIFT REPORT

CHANGED BEHAVIOR
- <behavior> → <canonical doc> → <updated / no change needed / conflict>

DECISIONS
- <ADR/RFC path or none>

MEMORIES
- <updated / deleted / none>

LINKS
- <checked paths> → <all resolve / broken: ...>

VERIFICATION
- pnpm check → <result>
- pnpm build → <result or not run + reason>

RESULT: synchronized | no drift (evidence above) | conflict flagged
```

## References

- `AGENTS.md#knowledge-maintenance`
- `.ai/README.md#precedence`
- `.ai/templates/memory.md`, `.ai/templates/working-memory.md`
