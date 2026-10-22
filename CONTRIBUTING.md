# Contributing

This is a solo project, but the workflow is written down so future-you (and an AI agent) can pick it
up without re-deriving it. You do not need to memorize `.ai/`; the agent reads it. Your loop is:

**describe → approve the plan/spec when asked → review the diff → commit.**

## Setup

Requirements: Node >= 24, pnpm 12.11, Git.

```sh
corepack enable
pnpm install
pnpm dev
```

`pnpm install` installs the pre-push hook (`core.hooksPath = .githooks`). Repair it with
`pnpm hooks:install`.

## Commands

```sh
pnpm dev            pnpm build          pnpm preview
pnpm lint           pnpm format         pnpm typecheck
pnpm test           pnpm check          pnpm verify
```

`pnpm check` is the handoff gate. `pnpm verify` adds the production build.

## The rules that matter

- **Do not let an agent stage, commit, or push without asking.** The approval gate is in `AGENTS.md`
  and enforced for OpenCode by `.opencode/opencode.jsonc`.
- **DOM only.** No canvas/WebGL. See `docs/decisions-not-to-fix.md`.
- **`src/game` is pure.** No React, DOM, storage, timers, clocks, or `Math.random`.
- **Tailwind + semantic tokens.** No CSS Modules, no raw hex in components.
- **New runtime dependency → ADR.** Prefer zero.
- **Update docs in the same change** as the behavior. Use the maintenance table in `AGENTS.md`.
- **Never weaken a test or lint rule to go green.**

## How to write what

Use the decision tree in `.ai/README.md`:

- current behavior/rules → `docs/`
- accepted decision and why → `decisions/ADR-NNN-...`
- proposal with alternatives → `rfcs/active/RFC-NNN-...`
- one task's plan → `.ai/specs/` (local, gitignored)
- in-flight context that must survive → `.ai/memories/working/`
- repeatable workflow → `.ai/skills/<name>/SKILL.md`
- role behavior → `.ai/agents/<role>.md`

## Working with agents

The full rundown — automatic vs. explicit invocation, sample prompts, and the gameplay/UI/architecture
loops — is in [`docs/working-with-agents.md`](docs/working-with-agents.md).

One instruction source: `AGENTS.md`. Tool folders are pointers into `.ai/`.

| Tool        | Instructions               | Skills / agents                        | Invoke a role                                          |
| ----------- | -------------------------- | -------------------------------------- | ------------------------------------------------------ |
| OpenCode V2 | `AGENTS.md`                | `.opencode/skills`, `.opencode/agents` | “Use the implementer subagent to…” or select the agent |
| Claude Code | `CLAUDE.md` → `@AGENTS.md` | `.claude/skills`, `.claude/agents`     | `@agent-designer` or “use the designer agent”          |
| Codex/other | `AGENTS.md`                | `.agents/skills`                       | “Act as the designer in `.ai/agents/designer.md`”      |

Roles: `documenter`, `game-designer`, `designer`, `implementer`, `reviewer`. The reviewer is opt-in
and read-only. The author commits.

### A typical change

1. Small change: describe it; the agent reads `AGENTS.md` and implements.
2. Architectural change: the agent drafts a spec; answer the questions; approve before code.
3. Gameplay: run `design-a-mechanic`; approve the brief, rules, and prototype plan.
4. UI: run `design-a-feature`; review the brief and the implementation against the checklist.
5. Handoff: the agent runs `pnpm check`, updates docs, and shows the diff. You commit.

### When something goes wrong

Ask: **what was missing from the instructions that allowed this?** Fix the instruction or doc, not
just the code. That is how the layer improves.

## Definition of done

- [ ] `pnpm check` passes with zero warnings.
- [ ] `pnpm build` passes when the app, build config, or styling changed.
- [ ] Layer boundaries hold; no canvas; no runtime network.
- [ ] New behavior has tests.
- [ ] Docs updated in the same change; links resolve.
- [ ] A decision has an ADR; a shipped RFC has an ADR and is archived.
- [ ] A new runtime dependency has an ADR.
- [ ] No secrets, no hand-edited generated output.
- [ ] Diff reviewed by the author. Commit made by the author.

## Commits

- One logical change per commit.
- The author writes/approves the commit message.
- The pre-push hook runs the gate. Emergency bypass (`--no-verify`) is exceptional; CI still checks.

## Tool adapters on Windows

`.claude`, `.opencode`, and `.agents` are symlinks into `.ai/`. Enable `core.symlinks` or replace each
with a one-line pointer file. Do not copy the content.

## Design reference

The visual direction and palette are in `docs/design-system.md` and
`decisions/ADR-006-cyberpunk-reference-visual-system.md`. The live cyberpunk.net palette and
composition were sampled on 2026-10-22. The reference's Blender Pro / Refinery-25 / Integral / Halis
GR / Proxima Nova fonts are proprietary and are **not** bundled; the project uses OFL lookalikes
(Anton, Chakra Petch, Rajdhani, JetBrains Mono) and original art. No reference artwork or logos are
copied.
