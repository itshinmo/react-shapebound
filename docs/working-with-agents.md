# Working with the agents

This project has one **primary agent** (the assistant you are talking to) and a small set of
**roles** and **skills**. The roles are not an autonomous company that runs itself. They are
bounded modes you or the primary agent can invoke when a task benefits from a separate context or a
hard boundary.

## The short answer

**You do not have to prompt every agent for every change.** The primary agent handles small changes
directly. For larger work, name the role you want; that makes the handoff deterministic.

- **Automatic:** `AGENTS.md` is loaded every session. Skill descriptions are advertised, and the
  primary agent can load one when the task matches. OpenCode permissions and the pre-push hook are
  deterministic.
- **Not automatic:** choosing a role for a multi-stage design process, approving a spec/stage, making
  a product decision, or committing. Those stay with you. The reviewer runs only when asked.

The reason for the split: model-driven delegation is useful but not a reliable substitute for an
explicit workflow. A one-line “use the game-designer subagent” removes the ambiguity.

## The pieces

| Piece                          | What it is                         | How it is used                                                  |
| ------------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| `AGENTS.md`                    | The single instruction source      | Loaded automatically; read it first                             |
| Skills                         | Repeatable workflows (`SKILL.md`)  | Loaded on demand by the primary agent or explicitly             |
| Agents                         | Roles with boundaries and handoffs | Primary agent can launch as subagents; most can also be primary |
| `.opencode/opencode.jsonc`     | Harness permissions                | Enforces git/destructive-command policy                         |
| `.githooks/pre-push`           | Quality gate                       | Runs `pnpm check` before a push                                 |
| `decisions/`, `docs/`, `rfcs/` | Durable knowledge                  | Written by `documenter`, read by everyone                       |

`design-a-mechanic` is a **skill**, not an agent. It is a staged workflow: brief → rules → prototype
plan → playtest → promote. The `game-designer` agent uses it. Only one stage file is loaded at a
time, and you approve each gate.

## Which path should I use?

| Your change                                                 | Ask for                                                   | Needs a spec?                                | Needs an ADR?                                           |
| ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Typo, copy tweak, small bug, test addition                  | Primary agent directly                                    | No                                           | No                                                      |
| Screen, component, interaction, visual state                | `designer` (UI brief) → `implementer`                     | No, a UI brief is enough                     | Only for a new design-system foundation                 |
| Gameplay rule, loop, balance, win condition                 | `game-designer` with `design-a-mechanic` → `implementer`  | Yes, mechanic spec in `.ai/specs/mechanics/` | If it changes a hard-to-reverse domain/rendering choice |
| Routing, state shape, save format, layers, major dependency | `documenter` (spec) → RFC if alternatives → `implementer` | Yes                                          | Yes, for the accepted decision                          |
| Docs/process correction                                     | `documenter`                                              | No                                           | No                                                      |
| Code review                                                 | `reviewer` only when asked                                | No                                           | No                                                      |

“Routine” means small, local, and reversible. If you are unsure, ask; the agent should stop rather
than invent.

## A typical gameplay session

1. **Describe the intent, not the implementation.**

   > We need a mechanic where X happens when the player does Y. Use the game-designer subagent to
   > draft the Stage 1 brief. Do not write code yet.

2. **Review the brief.** The agent should ask about player experience, constraints, non-goals, and
   open questions. Answer the blockers.

3. **Approve the next gate.**

   > The brief is approved. Continue the rules stage. Make state, transitions, invariants, edge
   > cases, and acceptance criteria explicit. Stop before implementation.

4. **Approve the rules and prototype plan.**

   > The rules are approved. Produce the Stage 3 prototype plan and the ordered task list. Do not
   > write code until I confirm.

5. **Implement.**

   > The plan is approved. Use the implementer subagent to implement the spec at
   > `.ai/specs/mechanics/<slug>.md`. Run `pnpm check` and show me the diff. Do not commit.

6. **Playtest.** Run `pnpm dev`, play the loop, and report observations. The agent records findings
   as `blocker` / `should` / `nit`; you decide what to change.

7. **Promote.** The agent folds durable rules into `docs/game-design.md`, adds an ADR if needed,
   deletes the spec, and reports what was synchronized. You review and commit.

## A typical UI session

1. > Use the designer subagent to produce a UI brief for this screen. Use the existing tokens and
   > primitives; do not add a new accent or typeface. Include empty, error, focus, and reduced-motion
   > states.

2. Review the brief. Approve or correct it.

3. > The brief is approved. Use the implementer subagent to implement it. Add component tests and run
   > `pnpm check`. Do not commit.

4. If you want a second opinion:
   > Use the reviewer subagent to review the current diff. Cite file:line and the rule/doc/ADR each
   > finding breaks. Order by severity.

## A typical architectural session

1. > This is an architectural change. Use the documenter subagent to draft a spec from
   > `.ai/templates/spec.md`. List the ambiguities and wait.

2. Answer the questions. If there are real alternatives:

   > Write an RFC with at least two real options and a recommendation. Do not implement until I
   > accept it.

3. After acceptance, the documenter writes the ADR, then the implementer implements. The RFC moves to
   `rfcs/archived/` and the indexes update.

## What the primary agent does automatically

- Reads `AGENTS.md` and follows its precedence, approval gate, and knowledge-maintenance table.
- May load a skill whose `description` matches the task.
- May launch a subagent when the role clearly matches the work and the client supports it.
- Runs `pnpm check` before handoff; the pre-push hook runs it again.
- Updates docs in the same change when it notices drift.
- Stops before staging/committing.

## What you should explicitly ask for

- A specific role when you want a named artifact: “use the **game-designer**…”, “use the
  **designer**…”, “use the **reviewer**…”.
- A stage boundary: “stop after the brief”, “do not write code yet”.
- A review: the reviewer never runs on its own.
- A decision: the agent can propose, but it must not accept an RFC or invent a mechanic.
- A commit: the approval gate forbids it unless you ask. Even then, review the diff first.

## What is not automated

- No CI job invokes an agent.
- No agent publishes, deploys, or commits on its own.
- No model/provider routing is configured per role; the process is model-agnostic.
- The staged mechanic pipeline does not advance itself. You approve each gate.
- There is no hidden “orchestrator” that silently spawns five agents. The primary agent is the
  orchestrator; subagents are fresh-context helpers with one bounded job.

## Why the roles exist

They are not decoration. Each one changes what the model is allowed to do:

- `documenter` writes specs/RFCs/ADRs, not production code.
- `game-designer` writes rules and balance, not code or UI.
- `designer` writes UI briefs and audits the design system, not gameplay.
- `implementer` implements an agreed plan, not a new architecture.
- `reviewer` is read-only and runs only on request; OpenCode enforces its read-only policy.

That separation prevents the classic failure where one agent “helpfully” designs, implements,
documents, and commits a plausible but unapproved change.

## The habits that matter

1. **Read the diff.** Every time. The whole safety model is this habit.
2. **Approve plans, not just code.** Correcting a one-page brief is cheaper than correcting an
   implementation.
3. **When something goes wrong, fix the instruction.** Ask “what was missing from `AGENTS.md`, the
   docs, or the skill that allowed this?” and update it.
4. **Keep one logical change per commit.** The author commits; the agent hands over the diff.
5. **Do not let process exceed the task.** A typo does not need a spec, an RFC, or a reviewer.

## Where to look

- `AGENTS.md` — the rules and precedence.
- `.ai/README.md` — the map, placement rules, and workflow diagram.
- `.ai/agents/*.md` — role boundaries and handoffs.
- `.ai/skills/*/SKILL.md` — repeatable workflows.
- `docs/architecture.md` — current behavior.
- `decisions/` — why decisions were made.
- `CONTRIBUTING.md` — the human loop and definition of done.
