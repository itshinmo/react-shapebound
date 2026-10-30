# ADR-017 — Progression save v2 with durable upgrade levels

- **Status:** Superseded by ADR-019 (purchase/refund transaction only)
- **Date:** 2026-10-29
- **Topic:** game domain / persistence
- **RFC:** — (the v2 payload was decided directly by the author; [RFC-001](../rfcs/archived/RFC-001-skill-tree-respec.md) was rejected. See [ADR-019](ADR-019-skill-tree-reset-all.md) for the current add-only purchase and reset-all rule.)
- **Refines:** [ADR-011](ADR-011-progression-save-v1.md) (ADR-011 remains accepted for v1 records; this ADR adds v2 and a linear read-time migration)
- **Superseded by:** [ADR-019](ADR-019-skill-tree-reset-all.md) (purchase/refund transaction only; the v2 payload, validation, migration, and death commit remain in force)

> **Partial supersession (2026-10-29).** ADR-019 replaces this ADR's per-level purchase/refund
> transaction with add-only purchases and a reset-all action. The v2 payload, validation, migration,
> and death commit described below remain in force. The body below is the historical v2 decision; any
> reference to RFC-001 as proposed or accepted is historical. Use ADR-019 for the current transaction.

## Context

The v1 progression record is the player's only durable progress. It has four fields — `bluePoints`,
`bestTimeMs`, `runCount`, and `bossCurrencies` — and no upgrade levels. `/skills` is read-only: it
shows the saved balance, best time, and run count over a locked preview map. Spending, unlocks, and
upgrades are not implemented.

The skill tree now needs durable levels and an atomic purchase/refund. A level that exists only in
React state disappears on reload. A spend written separately from its level can leave the balance and
the tree inconsistent. The persistence layer therefore needs one record that contains both the
balance and every upgrade level, and one write that changes both together.

The code still reflects v1. `src/game/save.ts` exports `SAVE_SCHEMA_VERSION = 1`; `createSave` stamps
that version, and `parseSave` rejects every other version as `unsupported-version`.
`src/game/progression.ts` validates only the four v1 fields. The v1 read/write policy lives in
`src/features/play/progression-storage.ts`.

ADR-011 deliberately deferred any schema change: a new required field, a new field meaning, or a
migration needs a new decision, a linear migration, old fixtures, and a docs update. This ADR is that
decision for v2. The fixed constraints still apply: offline local storage, a pure `src/game` with no
storage, clock, DOM, or randomness, no backend, no new runtime dependency, no IndexedDB, and no
active-run persistence.

The author fixed the v2 payload: the seven upgrade keys, their all-zero defaults, and their maxima.
Those values are recorded here so implementation does not infer a different tree, cost curve, or
cap. This ADR does not claim the values are playtested.

## Decision

**Key and version.** Keep the existing key `shapebound:save` and the existing envelope. Writes use
`schemaVersion: 2`; reads accept `1` and `2`. `savedAt` remains an app-supplied non-empty ISO-8601 UTC
string. The domain still never reads a clock.

The v2 record is:

```json
{
  "schemaVersion": 2,
  "savedAt": "2026-10-29T12:00:00.000Z",
  "data": {
    "bluePoints": 0,
    "bestTimeMs": 0,
    "runCount": 0,
    "bossCurrencies": { "purple": 0, "green": 0, "orange": 0 },
    "upgrades": {
      "barrierCount": 0,
      "movementSpeed": 0,
      "playerSize": 0,
      "arenaSize": 0,
      "reflectCharges": 0,
      "reflectChargeSpeed": 0,
      "laserPierce": 0
    }
  }
}
```

**Validation.** `data` is a plain object, not an array or `null`, with exactly five required fields.
`upgrades` is a plain object with all seven required keys. The v1 fields keep the ADR-011 rules:
`bluePoints` is a safe integer in `[0, MAX_BLUE_POINTS]`; `bestTimeMs` and `runCount` are non-negative
safe integers with no smaller design cap; `bossCurrencies` has all three keys, each a non-negative
safe integer.

Each upgrade level is a safe integer within its maximum:

| Key                  | Range |
| -------------------- | ----- |
| `barrierCount`       | 0–3   |
| `movementSpeed`      | 0–5   |
| `playerSize`         | 0–5   |
| `arenaSize`          | 0–5   |
| `reflectCharges`     | 0–3   |
| `reflectChargeSpeed` | 0–4   |
| `laserPierce`        | 0–2   |

A missing required upgrade key, a non-number, a non-safe integer, a negative value, or a value above
its maximum is `invalid-data`. A level is never clamped on read. Extra keys inside `data`,
`bossCurrencies`, or `upgrades` are ignored on read and dropped by the canonical write, which is the
same policy as ADR-011. Unknown extra keys are not upgrade levels and must not become durable or
interactive.

**v1 migration.** A structurally valid v1 record maps to v2 by adding all seven upgrades at zero.
`bluePoints`, `bestTimeMs`, `runCount`, and all three `bossCurrencies` values are preserved. The
migration is a read-time interpretation, not a write: the stored v1 envelope remains v1 until a
legitimate death commit or tree transaction writes a v2 envelope. A v1 record with any invalid field
remains `unreadable` with `invalid-data`; it is never defaulted.

Any `schemaVersion` other than `1` or `2` is `unsupported-version`. A non-number `schemaVersion` is
an invalid envelope, as before.

**Read outcomes are unchanged.** The storage port still returns one of four outcomes:

| Outcome       | Meaning                                                                         | Write behavior                               |
| ------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| `none`        | The key is absent. The base is the all-zero v2 record, including zero upgrades. | A write is allowed.                          |
| `valid`       | A v1 or v2 envelope passes validation. The result is normalized to v2 data.     | Use the validated data; never write on read. |
| `unreadable`  | `invalid-json`, `invalid-envelope`, `invalid-data`, or `unsupported-version`.   | No write. Block the overwrite.               |
| `unavailable` | The storage API is absent, its probe fails, or the read throws.                 | No write. No retry that can succeed.         |

`unreadable` and `unavailable` never fall back to zero and never permit a write.

**Death commit.** The commit boundary is unchanged: read once, compute from the frozen death values,
latch one envelope, and attempt one write.

1. `unreadable` or `unavailable` → settle that outcome, build no envelope, write nothing.
2. `none` → use the all-zero v2 base, including zero upgrades. `valid` → use the validated v2 data,
   which may have come from a migrated v1 record.
3. Compute `runPoints = floor(deathAtMs / 1000)`,
   `bluePoints = min(MAX_BLUE_POINTS, existing.bluePoints + runPoints)`,
   `bestTimeMs = max(existing.bestTimeMs, deathAtMs)`,
   `runCount = min(Number.MAX_SAFE_INTEGER, existing.runCount + 1)`, copy `bossCurrencies`
   unchanged, and copy all seven upgrade levels unchanged.
4. Build a v2 envelope with the app-supplied `savedAt`, latch it, and attempt one write. A failed
   write stays `failed`; Retry writes the same latched envelope and never re-adds the run or changes
   the levels. Leaving discards the unsaved run.

A missing save commits with zero upgrades. Existing levels are never reset, recomputed from effects,
or spent by a death.

**Purchase and refund.** A tree transaction changes exactly one level and returns the next full v2
record and one envelope. The caller writes that envelope once. There is no multi-level or bulk
transaction in this decision.

- Purchase: if the level is below its maximum and `bluePoints >= 1`, the level increases by one and
  `bluePoints` decreases by one.
- Refund: if the level is above zero, the level decreases by one and `bluePoints` becomes
  `min(MAX_BLUE_POINTS, bluePoints + 1)`. This is a full refund of one blue point per level, with no
  fee. At the serialization cap the excess point is discarded by the clamp.
- If the read is `unreadable` or `unavailable`, no transaction envelope is built.
- If the write fails, the UI must not apply the change in memory. The stored record stays as it was;
  there is no partial spend and no optimistic level. The next attempt re-reads the stored record.
- All tree writes happen outside a run. The tree is a presentation route, not a run surface.

The interaction that triggers an add or remove — gestures, visible controls, confirmation, and
accessibility — is not decided here; it is proposed in [RFC-001](../rfcs/archived/RFC-001-skill-tree-respec.md).

**No active-run persistence.** The seed, elapsed time, current-run points, enemy world, banner, and
commit latch remain in memory only. They are not in the v2 record. There is no resume or mid-run save.

**No boss currency award or spend.** The three boss balances remain reserved. This slice writes and
preserves them but never awards or spends them.

**No new storage key, runtime dependency, or IndexedDB.** The record remains small enough for
`localStorage`, and hand-written guards remain sufficient for this shape.

## Options considered

- **Extend v1 with optional upgrade fields.** Rejected. It violates ADR-011's rule that a schema
  change needs a new decision. It also makes a missing `upgrades` key ambiguous: is the record a
  legitimate v1 record, or a damaged v2 record? A v1 reader could accept a tree record and ignore its
  levels; a v2 reader could treat missing levels as zero. That is silent reinterpretation of old data.
- **A second `shapebound:upgrades` key.** Rejected. `localStorage` has no transaction across keys. A
  purchase could spend points and then fail to write the level, or write the level and then fail to
  spend the points. Two keys also split read, reset, migration, and corruption handling, and can
  diverge between tabs. One record and one write keep the balance and levels consistent.
- **v2 on the existing key with a linear v1 → v2 migration (chosen).** One record, one write, one
  reset path, and v1 saves stay readable. Cost: an explicit version branch and old fixtures.
- **Persist the tree only in memory.** Rejected. Levels would reset on reload, so spending and respec
  would not be durable. The tree would be a toy rather than progression.
- **Do nothing: keep `/skills` read-only and v1.** Rejected. It does not meet the requested tree and
  leaves no durable place for levels. It remains the safe fallback if the tree is not built, but it
  is not this decision.

## Rationale

The player's balance and levels must change together. One record plus one write is the only design in
this stack that makes that true without a transaction service. A required `upgrades` object makes a
missing level a visible corruption rather than an implicit zero. An explicit version bump and a
linear read-time migration preserve the ADR-011 honesty policy: old data is interpreted, not
silently rewritten, and an invalid record still blocks writes. The existing key, envelope, storage
adapter, and pure-domain boundary are sufficient; no new dependency or storage model is needed.

## Consequences

- The v2 shape is hard to reverse. Adding, removing, or renaming an upgrade key, or changing a
  maximum, needs a new schema decision, a migration, and old fixtures. A future additive node is not
  free: an older v2 record lacks it, so a v2 validator that requires it would reject that record.
  Either bump the schema and migrate, or define an explicit additive policy. Do not add an optional
  key by habit.
- v1 saves remain readable through the migration. The first legitimate death commit or tree
  transaction writes v2; a player who only reads `/skills` keeps a v1 record on disk. Reading never
  rewrites the record.
- The existing test that treats `schemaVersion: 2` as unsupported must flip: v1 is now readable and
  versions other than 1 or 2 are unsupported. Tests that generate v1 data with `createSave` must use
  literal v1 fixtures, because `createSave` now stamps v2.
- `SAVE_SCHEMA_VERSION` becomes 2. The generic envelope parser must accept `1` and `2` and apply the
  progression migration; a parser that remains current-version-only cannot be the production
  progression read path.
- `MAX_BLUE_POINTS` remains a `[unverified]` serialization bound, not an economy cap. A refund at the
  cap loses the excess point by the clamp.
- Purchase/refund failure is visible and non-optimistic. The UI must not show a level or balance the
  stored record does not have. There is no partial spend and no multi-level write.
- `/skills` remains read-only until RFC-001 is accepted and its UI is implemented. This ADR decides
  persistence, not gestures or confirmation.
- `.ai/specs/ui/skills-page.md` is stale: it specifies a read-only page, every node `LOCKED`, and no
  spend, unlock, or upgrade action. It must not be implemented as written for the interactive tree;
  it needs a new or superseding UI brief after RFC-001.
- When the code lands, update `docs/architecture.md#settings-and-local-state`,
  `docs/architecture.md#future-save-migrations`, `docs/runbook.md#save-recovery`,
  `docs/game-design.md`, `docs/components.md`, `docs/overview.md`, `README.md`, `AGENTS.md`,
  and the memories. Add ADR-017 to `decisions/README.md`.
- No boss currency is awarded or spent. No active-run persistence is added. No new storage key,
  runtime dependency, or IndexedDB is introduced.
