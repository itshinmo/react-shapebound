# ADR-011 — Progression save v1 and unreadable-save policy

- **Status:** Accepted
- **Date:** 2026-10-26
- **Topic:** game domain / persistence
- **RFC:** —
- **Refines:** [ADR-003](ADR-003-pure-game-domain.md) (the first concrete save payload; the generic
  envelope, purity, and storage-adapter rules stand)

## Context

The movement slice established a generic versioned save envelope at `shapebound:save` but had no save
data. The survival run loop now needs a durable progression record: blue points earned by active
survival time, the best completed-run time, the number of committed deaths, and the three boss
currency balances that a later boss slice will eventually award.

The record is written once at death, not continuously. There is no active-run persistence, no resume,
and no run history; the run itself is ephemeral. The author approved the v1 payload and the
unreadable-save policy. The UI briefs still contain the earlier single-`bluePoints` model and an
“unreadable = 0, next death overwrites” rule; those descriptions are stale and must be reconciled,
not implemented.

The constraints are fixed: no backend, offline local storage, a pure `src/game` (no storage, clock,
or DOM), no new runtime dependency, and no migration in this slice. The save must also be honest. A
corrupt record must not be silently replaced by a fresh one, because that would destroy the only
progression the player has.

## Decision

**Key and envelope.** Use the existing key `shapebound:save` and the existing generic envelope. The
v1 record is:

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-10-26T12:00:00.000Z",
  "data": {
    "bluePoints": 0,
    "bestTimeMs": 0,
    "runCount": 0,
    "bossCurrencies": {
      "purple": 0,
      "green": 0,
      "orange": 0
    }
  }
}
```

`data` is exactly those four fields. `savedAt` is supplied by the app as a non-empty ISO-8601 UTC
string; the reader requires a non-empty string (the existing envelope rule), and the domain never
calls `Date.now`. `schemaVersion` must be exactly `1`.

**Validation.**

- `bluePoints` is the saved balance. It must be a safe integer in `[0, MAX_BLUE_POINTS]`.
  `MAX_BLUE_POINTS = 1_000_000_000` is a `[unverified]` serialization bound, not an economy cap.
- `bestTimeMs` is the best completed-run time in active milliseconds. It must be a non-negative safe
  integer and has no design cap.
- `runCount` is the number of committed deaths. It must be a non-negative safe integer and has no
  smaller design cap.
- `bossCurrencies` is a plain object with all three keys, each a non-negative safe integer. This
  slice writes and displays zeros and never awards a boss currency. A structurally valid nonzero
  value is preserved, never spent or fabricated.
- `data` and `bossCurrencies` must be plain objects, not arrays or `null`. A missing field is
  `invalid-data`, not a defaulted field.
- Extra keys inside `data` or `bossCurrencies` are ignored on read. A successful commit writes the
  canonical four-field record and drops them. A future additive field is therefore a new schema
  decision, not a silent write-through.
- Any `schemaVersion` other than `1` is `unsupported-version`.

**Read result is explicit.** The storage port returns one of four outcomes:

| Outcome       | Meaning                                                                       | Commit behavior                      |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `none`        | The key is absent. Base values are all zero; this is not an error.            | A write is allowed.                  |
| `valid`       | The envelope and data pass validation.                                        | Use the validated data.              |
| `unreadable`  | `invalid-json`, `invalid-envelope`, `invalid-data`, or `unsupported-version`. | No write. Block the overwrite.       |
| `unavailable` | The storage API is absent, its probe fails, or the read throws.               | No write. No retry that can succeed. |

`unreadable` and `unavailable` never fall back to zero and never permit a write.

**Commit once at death.** Read once, compute from the frozen death values, latch one envelope, and
attempt one write.

1. `unreadable` → settle `unreadable`, build no envelope, write nothing, add nothing.
2. `unavailable` → settle `unavailable`, build no envelope, write nothing.
3. `none` → use all-zero base values. `valid` → use the validated data.
4. Compute:
   - `runPoints = floor(deathAtMs / 1000)`;
   - `bluePoints = min(MAX_BLUE_POINTS, existing.bluePoints + runPoints)`;
   - `bestTimeMs = max(existing.bestTimeMs, deathAtMs)`;
   - `runCount = min(Number.MAX_SAFE_INTEGER, existing.runCount + 1)`;
   - `bossCurrencies` copied unchanged.
5. Build `createSave({ bluePoints, bestTimeMs, runCount, bossCurrencies }, savedAt)` with an
   app-supplied ISO-8601 UTC timestamp. Latch that exact envelope and its written data.
6. Attempt one write. `saved` means the record changed. `failed` means it did not.

Only a successful death commit changes stored progression. `runCount` counts committed deaths only,
including zero-point deaths. It never counts started, discarded, failed, unreadable, or unavailable
runs. A missing save followed by a 0-point, 0 ms death still writes `bluePoints` 0, `bestTimeMs` 0,
`runCount` 1, and boss currencies 0.

**Write failure.** A failed write after a valid read is `failed`, not `unreadable`. The run-over shows
the run's points as not saved and offers Retry save. Retry writes the **same latched envelope**; it
never re-reads, recomputes, or adds the run points again. A successful retry changes
`failed → pending → saved` and applies the latched values exactly once. A failed retry stays
`failed`. Leaving, reloading, or restarting discards the unsaved points and the latch; there is no
in-memory carry into the next run.

**Unreadable save blocks overwrite.** If the existing record is `unreadable`, no envelope is built,
nothing is written, and no points, best time, or run count are added. The run-over shows the final
time and points as not saved and routes the player to `/settings` to clear local data. It does not
offer a Retry save that would overwrite the record. Retry (new run) and Back to title remain
available. Until the record is cleared, later deaths are `unreadable` again.

**Storage unavailable.** If the storage API is absent or unusable, no write is attempted and no
envelope is latched. The run-over says the points were not saved because storage is unavailable and
does not offer a Retry save that cannot succeed. A `/settings` reset cannot repair an absent storage
API, so it is not presented as the fix for this state. If storage becomes available in a later
session, the next death reads and writes normally.

**Reset recovery.** `/settings` local-data reset removes `shapebound:save` and `shapebound:settings`,
resets the settings provider to system defaults, and rewrites the settings defaults. After the reset
the save key is absent, `/skills` shows the no-save base values, and the next death writes a fresh v1
record. The pause-menu config cannot reset local data; it writes settings only.

**No migration.** The envelope stays version 1 and there is no migration in this slice. A future
schema change, a new required field, or a change to a field's meaning needs a new decision, an
explicit linear migration, old fixtures, and an update to
`docs/architecture.md#future-save-migrations`. Do not silently reinterpret v1.

**No active-run persistence.** The run seed and enemy state are not in this record. ADR-003's “the
seed and cursor are part of the save” applies to a future active-run save, not to the progression
record; no active-run save exists in this slice. Run time, the current run's points, enemies, and the
seed are in memory only and are discarded on reload, browser back, route change, Restart, or Retry.

## Options considered

- **Single `bluePoints` field.** Simplest record and easiest to reason about. Con: cannot show best
  time or run count; the approved `/skills` and run-over need more than a balance; adding fields
  later is a schema change with the same migration cost.
- **Treat an unreadable record as zero and overwrite on the next death.** Recovers automatically
  without a settings trip. Con: silently destroys the only progression, hides corruption, and can
  erase a legitimate record because of a transient parse/version problem. Rejected.
- **Back up the raw unreadable record to a second key, then overwrite the primary.** Preserves the
  bytes for manual recovery. Con: still writes over the primary record, adds a second key and
  lifecycle, and needs a recovery UI that does not exist in this slice. The player would not know the
  backup existed. Rejected.
- **IndexedDB.** Room for larger saves and structured data. Con: asynchronous complexity and a second
  storage model for a record this small; localStorage is enough until a save-size problem is measured
  (ADR-003). Rejected for v1.
- **Commit continuously or at checkpoints.** Fewer lost points on a crash. Con: requires active-run
  persistence, a resume/recovery policy, and more writes; this slice explicitly has none of those.
  Commit-on-death is the approved boundary.
- **Commit on death, block on unreadable (chosen).** One write per run, honest failure states, and a
  deliberate reset path. Cost: the player must visit `/settings` to recover, and a corrupt record
  blocks progression until then.

## Rationale

The record is the player's only durable progress, so the design favors honesty over automatic
recovery. Treating corruption as zero would make the game appear to work while deleting the evidence;
blocking the write preserves the record until the player explicitly clears it. A four-field payload
captures the progression the run loop and `/skills` already promise without inventing a node tree,
costs, or boss awards. Committing once at death keeps the save out of the active run and avoids an
active-run schema that this slice does not support. The existing envelope, storage adapter, and pure
domain rails from ADR-003 are sufficient; no dependency or schema library is needed.

## Consequences

- The v1 payload is now a multi-field contract and is hard to reverse. Changing field meaning, adding
  a required field, or tightening validation needs a new ADR, a migration, and old fixtures.
- `MAX_BLUE_POINTS` and all balance values remain `[unverified]` until playtested. The cap is a
  serialization bound, not an economy state; confirm it before freezing the validator.
- An unreadable save blocks every death commit until `/settings` reset. The player can lose runs if
  the copy or route is unclear. Test the full unreadable → Retry → death → reset → fresh-write path.
- A failed write is transient: the same latched envelope is retried, and leaving discards the unsaved
  points. There is no in-memory carry into the next run.
- `runCount` counts committed deaths only. A death whose commit failed, was unreadable, or was
  unavailable does not increment it.
- `bossCurrencies` is reserved and always zero in this slice. The UI must not imply that a boss can
  be defeated or a currency earned yet.
- The UI briefs must be reconciled before implementation: `run-over.md` and `skills-page.md` still
  describe the single-field, overwrite-on-read-0 model and must not be implemented as written.
- When the code lands, update `docs/architecture.md#settings-and-local-state`,
  `docs/architecture.md#future-save-migrations`, `docs/runbook.md#save-recovery`,
  `docs/game-design.md`, `docs/components.md`, `docs/overview.md`, `README.md`, `AGENTS.md`, and the
  memories.
- No new runtime dependency and no storage schema library. Hand-written guards remain sufficient.
