# ADR-019 — Skill tree reset-all and add-only levels

- **Status:** Accepted
- **Date:** 2026-10-29
- **Topic:** game domain / persistence
- **RFC:** — ([RFC-001](../rfcs/archived/RFC-001-skill-tree-respec.md) was rejected; this is a direct author decision)
- **Supersedes:** [ADR-017](ADR-017-progression-save-v2.md) (purchase/refund transaction only; the v2
  payload, validation, migration, and death commit remain in force)

## Context

ADR-017 fixed the v2 progression payload: seven required upgrade levels, validation, the v1 → v2
read-time migration, and the death commit. It also defined a per-level purchase/refund transaction.
That transaction allowed a player to remove one level at a time and receive one blue point back.

RFC-001 proposed a per-level respec interaction built around that transaction: a hybrid of direct
gestures and a visible minus control. The author rejected RFC-001 and chose a different removal model:
levels are add-only, and the only way to remove them is a single Reset Skills action that clears the
whole tree and refunds everything spent. This avoids per-level removal UI, per-level refund edge
cases, and the accessibility/gesture trade-offs in RFC-001.

The current `/skills` page is still a read-only locked preview. This ADR records the approved design;
it does not claim the tree or the Reset Skills button is implemented. The seven curves, the one-point
per level cost, the run-start gate, the barrier drops, and the v2 save schema do not change. The reset
is a transaction over the existing v2 record, not a schema revision.

The fixed constraints remain: a pure `src/game` with no React, DOM, storage, clocks, or randomness; no
new storage key; no runtime dependency; no IndexedDB; no active-run save; and all tree writes outside
a run.

## Decision

**Add-only levels.** A player purchases one level at a time for one blue point. Levels never decrease
individually. There is no per-level refund, no `remove` direction, and no `no-levels` result. A primary
click or tap on a known node adds one level; the Reset Skills action is the only removal and refund
path.

**Reset Skills button.** `/skills` exposes a visible Reset Skills button. It is disabled when all
seven upgrade levels are 0; the disabled state is visible and performs no write. The button placement,
copy, and focus behavior belong to the UI brief, not this ADR.

**In-app confirmation.** Activating Reset Skills opens an in-app confirmation. Cancel is a no-op: it
closes the confirmation and leaves the record, the levels, and the balance unchanged. Only Confirm
runs the reset transaction.

**Reset arithmetic.** On Confirm:

1. `spent = sum of all seven upgrade levels`.
2. Set all seven levels to 0.
3. Set `bluePoints = min(MAX_BLUE_POINTS, bluePoints + spent)`. At the serialization cap the excess
   refund is discarded.
4. Preserve `bestTimeMs`, `runCount`, and `bossCurrencies` unchanged.

The reset is one atomic full-record v2 envelope write. It is not a loop of per-level writes and has no
partial state. A readable save (`none` or `valid`) is required; `unreadable` and `unavailable` block
the action. The action runs outside a run, and only one reset or purchase may be in flight at a time.
If the write fails, the UI must not commit the in-memory change; the stored record stays as it was, and
the next attempt re-reads it.

**No schema change.** The reset uses the existing seven upgrade keys and the existing v2 envelope. It
introduces no new storage key, no runtime dependency, no active-run save, and no boss currency
award or spend.

## Options considered

- **Per-level respec (RFC-001).** Rejected by the author. It needs per-level removal controls or
  gestures, a refund for every removed level, and the accessibility and accidental-removal trade-offs
  documented in RFC-001. The author chose a simpler whole-tree reset.
- **Reset-all with confirmation (chosen).** One removal path, one refund calculation, and one atomic
  write. It preserves the existing v2 schema and lets a player restart a build without per-level
  controls.
- **No respec.** Rejected. It leaves a mistaken or obsolete build permanently stuck and makes the
  tree less useful for experimentation. RFC-001 already rejected the one-way-spending status quo.
- **Reset with a fee or cooldown.** Rejected. It adds an economy or timer rule the author did not ask
  for, complicates the confirmation copy, and has no playtest basis in this slice.

## Rationale

Add-only levels make every purchase a single, legible step. A whole-tree reset gives the player a
clean way to recover from a bad build without introducing per-level removal, per-level refund tests,
or the gesture-versus-keyboard conflict that caused RFC-001 to be rejected. The reset is still one
full-record v2 write, so the balance and all seven levels change together and a failed write cannot
leave a partial refund. The confirmation is the safety boundary; the disabled state avoids a
meaningless write when nothing is purchased.

## Consequences

- ADR-017 is partially superseded: its v2 payload, validation, migration, and death commit remain in
  force, but its per-level purchase/refund transaction is replaced by add-only purchase plus reset-all.
- RFC-001 is rejected and archived. It remains the record of the per-level alternative; it is not the
  current interaction.
- The save v2 spec and the skill-tree rules must replace the per-level refund contract with
  `purchaseUpgrade` and `resetUpgrades`. Remove per-level refund tests and add reset tests for zero
  levels, one level, several levels, the `MAX_BLUE_POINTS` cap, preserved fields, `unreadable` and
  `unavailable` reads, a failed write, no input mutation, and one envelope per action.
- The UI brief owns the Reset Skills button placement, copy, disabled state, and confirmation focus.
  The tree remains read-only until that brief is implemented.
- Reset at the cap discards the excess refund. This follows the serialization-bound role of
  `MAX_BLUE_POINTS`; it is not an economy statement.
- There is no per-level removal, no `remove` direction, no `no-levels` result, and no right-click,
  long-press, or minus interaction. A future per-level removal request is a new decision, not a
  configuration of this one.
- The seven curves, the one-point cost, the run-start gate, the barrier drops, and the v2 save schema
  are unchanged.
- No new runtime dependency, no new storage key, no active-run save, and no boss changes.
- When the code lands, update the save spec, tree rules, UI brief, tests, and current-behavior docs.
  This ADR is already indexed in `decisions/README.md`.
