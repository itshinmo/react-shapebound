# Working memories

Committed, temporary context that must survive a session or a switch between tools. This is a
buffer, not a journal.

## Lifecycle

- **Resolve before the linked change lands:** promote the durable parts, then **delete the file**.
- **Promotion targets:**
  - current behavior → `docs/`
  - accepted decisions → `decisions/`
  - proposals → `rfcs/active/`
  - durable agent context → `.ai/memories/`
  - reusable workflows → `.ai/skills/`
- **Idle for 30 days → promote, update, or delete.**

## Rules

- One topic per file, named `<kebab-topic>.md`.
- Present tense, evidence first, no secrets.
- Never use a working memory as the permanent home of a decision.
- If it is one deliverable's plan, it belongs in `.ai/specs/` instead (local, gitignored).

## Template

Use `.ai/templates/working-memory.md`.

```yaml
---
description: <what is being investigated or built>
status: active # active | blocked | ready-to-promote
related: <branch, issue, RFC, or spec>
created: YYYY-MM-DD
---
```

Sections: Context / Findings & hypotheses / Open questions / To promote on resolution.
