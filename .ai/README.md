# The AI layer

This directory is the **orientation and workflow layer** for AI-assisted work on react-shapebound.
It is not a second documentation site. The substance lives in `docs/`, `decisions/`, and `rfcs/`;
this folder points at it.

## The stand-alone test

> If every AI tool and this directory were deleted, the app, the docs, and every decision must
> still stand on its own.

Runtime code never reads from `.ai/`. If a fact is needed to run or understand the project, it
belongs in `docs/` or `decisions/`, not here.

## What belongs where

| Location                | Holds                                               | Test question                                          |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `docs/`                 | current behavior, rules, design system, procedures  | Would a human need it with no AI tooling?              |
| `decisions/`            | accepted decisions and why (ADRs)                   | Does it record **why** something was decided?          |
| `rfcs/`                 | proposals (`active/`) and closed ones (`archived/`) | Is it proposed, not yet decided?                       |
| `.ai/memories/`         | short, present-state orientation for agents         | Does it help an agent decide without being a contract? |
| `.ai/memories/working/` | committed in-flight context                         | Is it still unresolved?                                |
| `.ai/skills/`           | how to perform a repeatable class of task           | Is it a repeatable workflow?                           |
| `.ai/agents/`           | role-specific behavior and boundaries               | Does it apply to one role only?                        |
| `.ai/templates/`        | templates for the above                             | —                                                      |
| `.ai/specs/`            | local task specs (**gitignored**)                   | Is it one deliverable's working plan?                  |

Rules underneath the table:

- **One source of truth — link, don't copy.**
- **Memories describe the present, not history.** History is ADRs, RFCs, and git.
- **No secrets, tokens, or private hostnames** in any file here.
- **Runtime code never reads from `.ai/`.**
- **Specs are local; working memories are committed** because they must survive switching machines
  or tools mid-task.

### Where does this go?

```text
Is it a fact about how the system works now, or a rule/procedure?
├── Yes → docs/
└── No
    ├── Is it a record of a choice already made, with reasoning?   → decisions/ADR-NNN
    ├── Is it a proposal with open alternatives?                   → rfcs/active/RFC-NNN
    ├── Is it one deliverable's plan, not meant for history?       → .ai/specs/
    ├── Is it temporary context that must survive a session?       → .ai/memories/working/
    ├── Is it short orientation that helps an agent decide?        → .ai/memories/
    ├── Is it a repeatable multi-step procedure?                   → .ai/skills/<name>/SKILL.md
    └── Is it behavior for one role only?                          → .ai/agents/<role>.md
```

## Precedence

1. The author's explicit instructions.
2. Code and config.
3. `docs/`.
4. `decisions/` (accepted ADRs).
5. Accepted `rfcs/`.
6. `.ai/memories/`.
7. `.ai/memories/working/`.
8. Assumptions.

Fix or flag the lower source and say so. Never silently pick one.

## The workflow

```text
documenter (spec/RFC) → game-designer (mechanic brief/rules) → designer (UI brief, if UI)
    → implementer → AUTHOR REVIEW → reviewer (on request) → commit (only when asked)

Gameplay: author ↔ game-designer ↔ implementer
UI:       author ↔ designer ↔ implementer
```

The reviewer is opt-in. Routine changes do not need a spec, an RFC, or a review agent. Add process
when the pain is real, not because a diagram exists.

## Roles

| Agent           | Produces                                       | Never does                                   |
| --------------- | ---------------------------------------------- | -------------------------------------------- |
| `documenter`    | specs, RFCs, ADRs, knowledge-sync reports      | production code                              |
| `game-designer` | mechanic briefs, rules specs, playtest plans   | production code, invented mechanics          |
| `designer`      | UI briefs, token/layout decisions, a11y review | business logic, gameplay rules               |
| `implementer`   | code and tests to an agreed spec               | architecture changes, new runtime deps       |
| `reviewer`      | read-only findings against the diff and docs   | rewriting, implementing, approving on intent |

## Skills

| Skill                  | Use when                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| `design-a-mechanic`    | adding or changing a gameplay rule, loop, balance value, or win condition |
| `design-a-feature`     | adding or changing a screen, interaction, component, or visual state      |
| `write-an-rfc`         | a change has real alternatives or needs a durable decision record         |
| `knowledge-drift-sync` | before handoff, or whenever code and docs may have diverged               |

## Memories and working memories

Memories are short (20–40 lines), present-tense, and carry a `last-verified` date. Each ends by
pointing at the authoritative doc. Read:

| Memory                    | When                                                 |
| ------------------------- | ---------------------------------------------------- |
| `overview.md`             | always, first                                        |
| `architecture.md`         | before changing structure, layers, state, or storage |
| `conventions.md`          | before writing code, CSS, or tests                   |
| `development-workflow.md` | before starting and before handing off               |

Working memories live in `.ai/memories/working/`. Lifecycle:

- Resolve before the linked change lands: promote the durable parts, then delete the file.
- Promotion targets: current behavior → `docs/`; accepted decisions → `decisions/`; proposals →
  `rfcs/active/`; durable agent context → `.ai/memories/`; reusable workflows → `.ai/skills/`.
- Idle for 30 days → promote, update, or delete.

## Tool adapters

This project uses pointer-only adapters. One source, many tools:

| Tool                 | Instructions               | Skills / agents                        |
| -------------------- | -------------------------- | -------------------------------------- |
| OpenCode V2          | `AGENTS.md`                | `.opencode/skills`, `.opencode/agents` |
| Claude Code          | `CLAUDE.md` → `@AGENTS.md` | `.claude/skills`, `.claude/agents`     |
| Codex / other agents | `AGENTS.md`                | `.agents/skills`                       |

The tool folders are symlinks into `.ai/`. Do not copy instructions into them. On Windows, symlink
adapters need `core.symlinks` enabled; if that is impractical, replace the symlink with a one-line
pointer file. The OpenCode project config at `.opencode/opencode.jsonc` adds harness-level
permissions; it does not carry knowledge.

## Adding a new mechanism

This directory is intentionally small. Add a skill the second time you repeat a multi-step task,
not the first time you read about it. Add an agent only when a role has a distinct boundary and a
typed handoff. Add a memory only when you notice yourself re-explaining the same orientation.
