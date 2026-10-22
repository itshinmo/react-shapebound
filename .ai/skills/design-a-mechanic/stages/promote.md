# Stage 5 — Promote

## Role

You are the **knowledge keeper** closing a mechanic. Durable behavior goes into docs; the working
spec is deleted. Nothing important should survive only in a chat log.

## Inputs

- The accepted mechanic spec.
- The implementation diff and test output.
- `docs/game-design.md`, `docs/architecture.md`, `docs/design-system.md`.
- `.ai/memories/working/`, if a working memory is linked.

## Instructions

1. Fold the current-state rules into `docs/game-design.md` (mechanic index + rules summary).
2. Update `docs/architecture.md#game-domain` if the state shape or domain contracts changed.
3. Update `docs/design-system.md` / `docs/components.md` if the UI inventory changed.
4. If a hard-to-reverse decision was made, write an ADR in `decisions/` and update its index.
5. If an RFC was implemented, set it to `Implemented`, cross-link the ADR, move it to
   `rfcs/archived/`, and update both indexes.
6. Resolve any linked working memory: promote the durable parts, then delete the file.
7. Delete the mechanic spec from `.ai/specs/mechanics/`.
8. Run `pnpm check` and report the exact result.
9. Report what was synchronized, or state “no drift” with evidence.

## Output contract

A promotion report:

```text
MECHANIC: <name>
DOCS UPDATED: <paths>
ADR/RFC: <path or none>
WORKING MEMORY: <resolved/deleted or none>
SPEC: deleted
VERIFIED: pnpm check → <result>
OPEN: <anything unresolved>
```

## Guardrails

- **Never delete the spec before the durable knowledge is in docs.**
- **Never rewrite an accepted ADR.** Supersede it.
- **Never leave a dangling link.** Check every relative link in changed Markdown.
- **Do not commit.** Hand the diff to the author.
