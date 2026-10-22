# ADR-004 — Agent-agnostic knowledge layer and guardrails

- **Status:** Accepted
- **Date:** 2026-10-21
- **Topic:** process / AI tooling
- **RFC:** —

## Context

The author is new to AI-assisted development and wants a repository that an agent can work in
reliably across sessions and tools. The risks are well known: the model lacks project context, docs
drift from code, two sources disagree with no tie-breaker, and an agent stages or commits work it
should not. The author also wants the project to remain understandable without any AI vendor.

## Decision

Adopt a small, layered, **agent-agnostic knowledge layer**:

- `AGENTS.md` is the single instruction source. `CLAUDE.md` is a one-line pointer; tool folders are
  symlinks into `.ai/`.
- Current behavior lives in `docs/`; decisions in `decisions/`; proposals in `rfcs/`; short agent
  orientation in `.ai/memories/`; repeatable workflows in `.ai/skills/`; role boundaries in
  `.ai/agents/`; templates in `.ai/templates/`; local task plans in `.ai/specs/` (gitignored).
- An explicit precedence order resolves contradictions; the lower source is fixed or flagged.
- A knowledge-maintenance table maps “if you change X, review Y”.
- The approval gate forbids staging, committing, and pushing unless the author asks. A pre-push hook
  and CI run the quality gate.
- The reviewer is opt-in, read-only, and judges the diff rather than intent.
- No MCP servers, model/provider selection, custom slash commands, or automation that runs agents.
  OpenCode gets a small project-level permission file as a harness safety net, not as knowledge.

The stand-alone test governs placement: **if every AI tool and `.ai/` were deleted, the app, docs, and
decisions must still stand**. Runtime code never reads `.ai/`.

## Options considered

- **Per-tool rule files** (`CLAUDE.md`, `.cursor/rules`, OpenCode config, etc.) — familiar, but copies
  drift and behavior differs per tool. Con: silent divergence.
- **One giant `AGENTS.md`** — simple. Con: burns context, irrelevant rules degrade attention, no
  progressive disclosure.
- **Everything under `.ai/`** — tidy for agents. Con: deleting it breaks the project; humans cannot
  find decisions; fails the stand-alone test.
- **Layered model (chosen)** — pointers, canonical docs, on-demand skills, explicit precedence.
  Con: more files to maintain; requires drift discipline and symlink support.

## Rationale

The layer is an information architecture, not a prompt collection. Separating current state (`docs/`),
history (`decisions/`), and proposals (`rfcs/`) prevents the same fact being re-explained in three
places. Progressive disclosure keeps the context window for the task. The approval gate and pre-push
hook move safety from the prompt into the repository. The pointers keep the setup portable across
Claude Code, OpenCode, Codex, and future tools.

## Consequences

- About 30 Markdown files to maintain. They are small; the drift-sync skill and maintenance table make
  upkeep executable rather than aspirational.
- Symlinked adapters need `core.symlinks` on Windows; documented in `CONTRIBUTING.md` and the runbook.
- The reviewer is not a mandatory gate; the author reviews every diff. This is deliberate for a solo
  project.
- The OpenCode permission file can block a command even when the author asks for it; edit the config
  deliberately if the policy changes.
- No vendor is required to build or understand the app.
- Add a skill when a workflow repeats; add an agent only when a role has a distinct boundary. Do not
  grow the layer for its own sake.
