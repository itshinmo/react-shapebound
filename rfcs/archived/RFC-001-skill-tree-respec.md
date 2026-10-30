# RFC-001 — Skill tree respec interaction

- **Status:** Rejected
- **Date:** 2026-10-29
- **Supersedes:** —
- **Superseded by:** [ADR-019](../../decisions/ADR-019-skill-tree-reset-all.md) (reset-all chosen)

## Context

`/skills` is currently read-only. `src/features/skills/skills-screen.tsx` reads the saved progression
record, shows the balance, best time, and run count, and renders a locked 3 × 3 `NodeMap` of generic
`NODE_01`–`NODE_09` labels. Its copy says “Upgrades are not available in this build.” The UI brief at
`.ai/specs/ui/skills-page.md` goes further: it specifies no spend, unlock, or upgrade action, every
node `LOCKED`, and a page that explicitly says the player cannot spend anything. That brief is stale
for the next step.

The save layer is moving first. [ADR-017](../../decisions/ADR-017-progression-save-v2.md) accepts a v2
progression record with seven durable upgrade levels and a pure purchase/refund transaction that
writes one full envelope atomically. The implementation contract is in
`.ai/specs/progression-save-v2.md`. That decision intentionally does not choose gestures, visible
controls, confirmation, or focus behavior. The author wants a tree where players can add and remove
levels, and asked for an RFC because the interaction has real alternatives.

The fixed constraints:

- Every screen must be usable with a keyboard, have a visible focus state, and use semantic HTML.
  A mouse-only or touch-only removal path is not sufficient.
- A successful tree action changes one level and one balance in one atomic save write. If the write
  fails, the UI must not show the change; the stored record stays as it was.
- A refund returns one blue point per removed level. A purchase costs one blue point per level.
- Unknown or placeholder nodes are locked. They never write and never spend.
- All tree writes happen outside a run.
- No confirmation dialog is requested; the author wants the action to stay direct.
- No production code, measurements, or playtesting results are claimed here. The pros and cons below
  are interaction reasoning, not measured performance.

The tension is direct manipulation versus accessibility and accidental removal. Left click/tap to add
is obvious and fast, but removal has no equally obvious pointer gesture. Right click and long-press are
hidden, not keyboard reachable, and can conflict with browser context menus, text selection, and
scrolling. A visible control is discoverable and accessible, but adds chrome and can feel slower for
multi-level respec.

## Options

### Option A — Direct gestures only

Left click/tap adds one level. Right click/long-press removes one level. There is no visible minus
control. The page is mouse/touch only.

- **Pros:** Fewest controls; the node itself is the entire interaction. Direct and fast for pointer
  users. No extra chrome in the tree.
- **Cons:** Removal is undiscoverable; nothing on screen says right-click or long-press exists.
  Right-click and long-press are not keyboard accessible, so a keyboard-only player cannot remove a
  level. Long-press conflicts with browser context menus, text selection, and scrolling, and needs
  cancellation rules. Accidental removal is easy with no confirmation. This violates the project's
  keyboard requirement. **Reject.**

### Option B — Explicit plus/minus only

Every node shows a visible add and a visible minus control. There are no gestures. Each activation
changes one level.

- **Pros:** Discoverable and symmetric. Both actions are native buttons, so keyboard, screen reader,
  and switch access work without hidden gestures. No context-menu or long-press conflict. Easier to
  test and to explain. Accidental removal is less likely than with a hidden gesture.
- **Cons:** More controls per node and more visual noise in an already dense tree. Repeatedly
  targeting a small minus control is slower for multi-level respec than direct manipulation. It does
  not deliver the author's requested direct manipulation. It is the safest fallback, but it is not
  the proposal.

### Option C — Hybrid: direct gestures plus a visible keyboard-reachable minus (proposed)

Left click/tap adds one level. Right click/long-press removes one level. Every node also has a
visible, keyboard-reachable minus action. Both paths perform the same one-level transaction. This is
the proposed option.

- **Pros:** Direct manipulation for mouse and touch, plus a visible and accessible removal path for
  keyboard and screen-reader users. Removal is discoverable because the minus is always present. The
  gesture is an enhancement, not the only route, so the keyboard requirement is met. One level per
  action keeps the cost and refund model simple. Full refund means an accidental removal costs time,
  not progress.
- **Cons:** Two removal paths must produce exactly the same result and the same save write. Long-press
  needs a timer, cancellation, context-menu suppression, and suppression of the click that follows a
  long-press; otherwise one gesture can add and remove. Right-click must suppress the browser menu
  only on interactive nodes. No confirmation means an accidental removal is immediate. The visible
  minus can be small, so its hit area and focus state need care. The extra chrome may compete with
  the node’s level and cost text.

### Option D — No respec (do nothing)

Keep one-way spending. Once a level is bought, it cannot be removed. The page stays read-only for
now, or becomes add-only later.

- **Pros:** Simplest interaction and save path; no removal gesture, no refund edge cases, no
  accidental removal. Current read-only UI and v1/v2 save remain unchanged.
- **Cons:** Does not meet the author's request to add and remove levels. Players cannot correct a
  mistaken purchase or experiment with a build. One-way spending makes the tree less legible and
  raises the cost of trying a different branch. The v2 levels would exist but respec would not.
  **Reject.**

## Decision

**Proposed: Option C — hybrid.** This RFC is `Proposed`; it becomes a decision only when the author
moves it to `Accepted`. The author has already answered the core interaction questions in principle:

- **Interaction model:** hybrid — direct gestures plus a visible keyboard-reachable minus.
- **Refund:** full refund of one blue point per removed level.
- **Confirmation:** none.
- **Granularity:** one level per action.

The exact proposal is:

1. **Interactive nodes only.** Only the seven v2 upgrade keys are interactive. Placeholder, unknown,
   or not-yet-implemented nodes are locked: no add, no remove, no write, and no spend. If a stored
   record contains an unknown upgrade key, the save reader ignores it and the tree does not render it
   as an interactive node.
2. **Add.** Primary click/tap on a node, or keyboard activation of its add action, adds exactly one
   level when the balance is at least one point and the level is below its maximum. A successful add
   debits one blue point. At max or with a zero balance, nothing is written and the node explains why.
3. **Remove by gesture.** Secondary click (right-click) on an interactive node, or a long-press on
   touch, removes exactly one level when the level is above zero. A successful remove refunds one
   blue point. At level zero, nothing is written and the node explains why.
4. **Remove by visible control.** Every interactive node has a visible minus action. It is a native
   button, reachable by Tab, activatable by Enter or Space, and produces exactly the same one-level
   removal and refund as the gesture. The gesture is never the only way to remove a level.
5. **One level per action.** No hold-to-repeat, no drag, no multi-level selection, no bulk respec, and
   no confirmation dialog. Repeating the action is how a player removes several levels.
6. **Full refund.** Removing a level returns one blue point, with no fee. Purchasing a level costs one
   blue point. The balance is clamped to `MAX_BLUE_POINTS` on refund; at the cap the excess point is
   discarded. The save contract is in ADR-017.
7. **Gesture safety.** A long-press fires once at the threshold defined by the UI brief. It cancels if
   the pointer leaves the node, the pointer is cancelled, the page scrolls, the route changes, or the
   press ends before the threshold. The click synthesized after a long-press removal is suppressed so
   one press cannot both remove and add. Right-click suppresses the browser context menu only on
   interactive nodes, not on the page. A normal tap or click adds; a long-press removes, never both.
8. **One in-flight action.** After an add or remove, ignore further activations until the save write
   settles. If the write fails, do not keep an optimistic level or balance; show the write failure and
   leave the stored values visible. Re-read the save before the next action. This prevents a double
   click or a repeated long-press from spending twice.
9. **Keyboard and focus.** The add target (the node body or a visible add control) and the minus
   action are native buttons and are not nested inside each other. Tab order follows the tree’s
   reading order. Focus is always visible. After a successful change, focus stays on the control that
   was activated (or on the node’s status if the node is re-rendered). After a failed write or a
   blocked action, focus moves to the error/status message or the message is announced politely
   without stealing focus. Do not put click handlers on plain `div`s.
10. **Labels and feedback.** Each control’s accessible name includes the node name, current level,
    maximum, and the effect of the action, for example “Barrier count, level 1 of 3. Add level for 1
    blue point” and “Barrier count, level 1 of 3. Remove level and refund 1 blue point.” The current
    balance and the result of an action are announced through a polite live region. Color is not the
    only signal; level, max, cost, and locked state are text.
11. **Pointer and touch details.** Tap adds; long-press removes; right-click removes. No drag and no
    hover-only affordance, because hover does not exist on touch. The visible minus is available on
    both. Long-press must not select text or open the platform menu on the node.
12. **Motion.** Level changes and feedback do not depend on animation. Any transition respects
    `prefers-reduced-motion` and the in-app reduced-motion setting.
13. **Persistence.** Each action reads the current v2 record, computes one level change, and writes
    one full envelope once. If the save is unreadable or storage is unavailable, the tree is blocked
    with the same recovery language as the rest of the app; no write is attempted. If the write
    fails, the stored record is unchanged. There is no second key, no partial spend, and no queued
    transaction.
14. **Outside a run.** The tree is a presentation route. It never writes while a run is active. The
    run-over link may open `/skills` only after the run is over and the commit is not pending.

**Accessibility tradeoff.** Option C does not make the gestures accessible; it makes them optional.
Right-click and long-press are shortcuts for pointer users. The visible minus is the accessible path,
so a keyboard-only or screen-reader player can perform every action. This is why Option A is rejected
even though it is the most direct.

**Accidental-removal tradeoff.** No confirmation is an explicit author choice. A right-click or a
long-press can remove a level immediately. Full refund makes the mistake economically recoverable:
the player can re-add the level for the same one point. It does not undo the time spent or prevent a
mis-tap; there is no undo stack and no confirmation dialog in this proposal. If accidental removal
proves common, a future RFC can add undo or a confirmation for the destructive path without changing
the save schema.

**Non-goals.** This RFC does not decide the tree layout, branch grouping, node names, per-node effect
copy, the long-press threshold, the exact hint text, or whether a one-time “right-click or long-press
to remove” hint is shown. Those belong in the UI brief after acceptance. It does not change the v2
save shape, cost per level, or the seven upgrade maxima.

## Consequences

**Positive**

- The tree supports add and remove with one level per action, one refund unit, and one atomic save
  write.
- Keyboard and screen-reader users have a visible, standard control for every action; gestures are
  enhancements, not requirements.
- Full refund keeps experimentation cheap and makes an accidental removal recoverable in currency.
- The save layer already has the v2 levels and transaction from ADR-017; the UI does not need a new
  storage model.

**Negative**

- Two removal paths (gesture and minus) must stay behaviorally identical; divergence would be a bug
  and a test gap.
- Long-press is platform-sensitive. It needs a timer, cancellation, context-menu suppression, and
  click suppression. A rushed implementation can remove and then add with one press.
- Right-click is not discoverable on its own. The visible minus is the discoverability fallback, but
  the gesture may still be unknown to many players.
- No confirmation means a mis-click or long-press removes a level immediately. Full refund mitigates
  the currency loss but not the interruption.
- Per-node minus controls add visual density. The tree must keep level, max, cost, refund, and locked
  state legible at mobile widths.

**Follow-up**

- The author moves this RFC to `Accepted` or rejects it. Do not implement the interaction before
  acceptance.
- On acceptance, write or update the `/skills` UI brief with `design-a-feature`; supersede
  `.ai/specs/ui/skills-page.md`, which currently says no spending and every node locked.
- Implement the save v2 contract from ADR-017 and `.ai/specs/progression-save-v2.md` first. The UI
  depends on the v2 transaction and read path.
- Add interaction tests for primary click/tap, right-click, long-press, minus-button activation,
  keyboard focus order, disabled/blocked states, one-in-flight behavior, write failure, and the
  absence of a write for locked or blocked actions.
- On ship, fold current behavior into `docs/` (`docs/game-design.md`, `docs/components.md`,
  `docs/architecture.md#routing`, `docs/design-system.md` if focus or motion rules change), write the
  durable interaction decision as an ADR, cross-link this RFC and the ADR, set the RFC to
  `Implemented`, move it to `rfcs/archived/`, and update both indexes.
- Update `AGENTS.md` and `README.md` where they still describe `/skills` as read-only; update
  `docs/game-design.md` open questions that this interaction answers.

**Open details for the UI brief (not blocking this RFC)**

- The long-press threshold and its cancellation behavior in concrete milliseconds.
- Whether a one-time hint explains right-click/long-press, and where it appears.
- The exact tree layout, branch grouping, and per-node effect copy.
- Whether the status live region announces every change or only errors.
- Whether a future undo is worth adding after playtesting; this RFC does not include one.

## Resolution

Rejected by the author on 2026-10-29. The chosen approach is add-only levels plus Reset Skills,
recorded in [ADR-019](../../decisions/ADR-019-skill-tree-reset-all.md); RFC-001 is kept as the rejected
alternative.
