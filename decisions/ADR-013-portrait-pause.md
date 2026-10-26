# ADR-013 — Portrait pause preserves the active run

- **Status:** Accepted
- **Date:** 2026-10-26
- **Topic:** play surface / orientation / run lifecycle
- **RFC:** —
- **Refines:** [ADR-009](ADR-009-static-player-container.md) (orientation gate behavior only; the
  static container collision boundary is unchanged)

## Context

The current play gate replaces the play surface in portrait. That unmounts the board and respawns the
centered player. The behavior was acceptable for a movement preview with no run state, but the run
slice adds an active clock, points, a timeline, enemies, and a commit-on-death. Unmounting would
silently discard all of it. Rotating a phone, hiding the tab, or losing window focus would become a
reset button, and the player could lose a run without making a decision.

The author approved a freeze-and-preserve model: portrait pauses the run, and returning to landscape
opens the pause menu. The existing hidden-tab and window-focus freezes must stack with it rather than
replace it. This is an orientation and run-lifecycle decision; the static container remains the only
player collision boundary, and the screen remains outside the collision model.

## Decision

**The play surface stays mounted.** In portrait, `/play` is not unmounted. `LandscapeGate` becomes a
blocking overlay over the still-mounted play surface and adds the `portrait` freeze reason. The board,
HUD, and enemy layer remain in place but do not step. Nothing is respawned or reset.

**The freeze set is stacked.** Freeze reasons are a set, never a boolean:

```text
canonical order: pause, hidden, portrait, focus
```

The run is active exactly when `status === 'active'` and the set is empty. `advanceRun` and
`stepEnemies` are no-ops while any reason is present, so the clock, points, timeline, boss banner,
enemy spawns, movement, aim, charge, warning, beam, collision, recycle, and invulnerability all stop
together. Adding an existing reason or removing an absent reason is a no-op.

- `pause` is added by the pause action and removed only by an explicit Resume. It is the only reason
  coupled to a menu.
- `hidden` is added while `document.visibilityState === 'hidden'` and removed when it becomes
  `visible`. No wall time is passed to the domain; the feature resets its rAF timestamp baseline on
  resume.
- `focus` is added on `window.blur` while the document is visible and removed on `window.focus`.
  Input is cleared on blur, no menu opens, and the run resumes only when focus returns and no other
  reason remains. This behavior is author-approved.
- `portrait` is added when the play gate detects portrait and removed on landscape.

**Return to landscape opens the pause menu once.** On `portrait` removal, the feature also adds
`pause` and opens the pause menu. The run stays frozen until the player explicitly selects Resume.
Returning to landscape never auto-resumes. The menu opens exactly once; a second open must not
duplicate the dialog or add a second `pause` reason.

**Terminal runs.** If the run is already over, portrait shows the gate; on return it shows the
run-over. No `pause` reason is added because the run is terminal. If the player rotates while paused,
`portrait` stacks on `pause`; on return the menu is open once and the run is still paused.

**Overlay priority.** Portrait gate, then run-over, then pause menu, then play. A lower-priority
overlay never resumes the run. Hiding a tab shows nothing; on return the highest-priority remaining
state is shown.

**The run remains in memory only.** Reload, browser back, route change, Restart, and Retry still
discard the run. Portrait, hidden, and focus preserve it while the page stays mounted; they are not
persistence. There is no active-run save.

**ADR-009 is unchanged.** The static outlined container remains the only player boundary; the screen
is not a collision boundary. This ADR changes the orientation gate lifecycle only. It does not
replace, loosen, or re-decide the container rule.

## Options considered

- **Keep unmount-and-respawn (current gate).** Simplest and already implemented. Con: silently
  discards the run, points, enemies, and the death commit; rotation becomes a reset button; directly
  contradicts commit-on-death and the run's stakes. Rejected.
- **Autosave the active run on portrait and resume it later.** Preserves across reloads and route
  changes. Con: requires an active-run save schema, a migration, and a resume/recovery policy that
  this slice explicitly excludes; a stale run could resume unexpectedly on a later visit. Rejected
  for this slice.
- **Auto-resume on return to landscape.** Fewer clicks. Con: drops the player into live threats and a
  moving clock without a read or a decision; unfair after an interruption. Rejected.
- **Hard-block portrait and declare the run lost.** Honest but punitive. Con: same data loss as
  unmount, plus a failure message the product does not want. Rejected.
- **Pause on return but do not open the menu.** Keeps the run safe with less chrome. Con: the player
  may not notice the run is still frozen; the approved behavior opens the menu once so the state is
  explicit. Rejected.
- **Freeze, preserve, and open the pause menu on return (chosen).** Keeps the attempt, makes the
  interruption recoverable, and returns control deliberately.

## Rationale

A run is a single attempt with meaningful time and points; an orientation change is not a player
decision to abandon it. Freezing preserves the attempt without adding persistence, and opening the
pause menu makes the resume explicit instead of dropping the player back into live threats. The
stacked freeze set already exists for hidden tabs and focus loss; portrait is one more reason, not a
second state machine. Keeping ADR-009's collision boundary untouched avoids conflating orientation
with the arena rule.

## Consequences

- `use-run-loop` must keep the play surface mounted and gate all stepping on the freeze set.
  `LandscapeGate` becomes an overlay, not a replacement.
- The rAF loop must reset its timestamp baseline after any freeze, including portrait return, so no
  wall time is added and no enemy step catches up.
- The pause menu must open exactly once on portrait return; a second open must not duplicate the
  dialog or add a second `pause` reason.
- The run-over and pause overlays must respect priority: portrait covers both; run-over covers pause;
  pause covers play.
- Tests must cover portrait → pause → resume, portrait while paused, portrait after death, blur while
  paused, hidden while paused, and focus return with another reason still present.
- The current `docs/runbook.md` troubleshooting line “The player resets after rotating to portrait”
  becomes wrong and must be replaced with the freeze/pause behavior.
- No save-schema change and no active-run persistence. The player still loses the run on reload,
  browser back, or route change; the copy must stay honest.
- When the code lands, update `docs/architecture.md#landscape-input-and-the-play-surface`,
  `docs/runbook.md`, `docs/components.md`, `docs/game-design.md`, `AGENTS.md`, and the memories.
