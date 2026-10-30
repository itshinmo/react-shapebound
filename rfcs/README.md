# Requests for comments

An RFC proposes a change with real alternatives. It is not binding until the author accepts it. One
decision per RFC.

## Layout

- `active/` — `Draft`, `Proposed`, or `Accepted` proposals.
- `archived/` — `Implemented`, `Rejected`, or `Superseded` proposals.
- Naming: `RFC-NNN-<kebab-case-title>.md`; next free number, never reused.

## Lifecycle

```text
Draft → Proposed → Accepted → Implemented → archived/
                 ↘ Rejected → archived/
```

1. Draft the RFC with `.ai/templates/rfc.md` and add a row below.
2. The author moves it to `Accepted`. Do not implement before that.
3. On ship: fold current-state facts into `docs/`, write the ADR, cross-link RFC ↔ ADR, set the RFC to
   `Implemented`, move it to `archived/`, and update this index.
4. If the author waives the RFC step, record the waiver and the options in the ADR instead.

## When not to write one

- A task plan → `.ai/specs/`.
- A hard-to-reverse choice with no meaningful alternatives → ADR directly.
- Current behavior → `docs/`.

See `.ai/skills/write-an-rfc/SKILL.md` for the full procedure.

## Index

| RFC                                              | Title                         | Status   | Date       |
| ------------------------------------------------ | ----------------------------- | -------- | ---------- |
| [RFC-001](archived/RFC-001-skill-tree-respec.md) | Skill tree respec interaction | Rejected | 2026-10-29 |
