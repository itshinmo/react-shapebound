# ADR-012 — Viewport-space enemy simulation with pure fixed-step pools and DOM node pooling

- **Status:** Accepted (refined by ADR-018 for reflected-beam combat, triangle body contact, and the current node-pool counts)
- **Date:** 2026-10-26
- **Topic:** game domain / rendering / performance
- **RFC:** —
- **Refines:** [ADR-002](ADR-002-dom-only-rendering.md) and
  [ADR-003](ADR-003-pure-game-domain.md) (the DOM-only and pure-domain rules stand)

## Context

The player is confined to a static, outlined 320 px container, and the screen is not a collision
boundary ([ADR-009](ADR-009-static-player-container.md)). The run slice needs threats that enter from
outside that small arena and cross the screen, so the arena feels pressured without becoming the whole
world. Two enemy kinds are specified: a red square that aims once and travels in a straight line, and
an orange triangle that stops, locks an aim, charges a telegraphed lane, and fires a hitscan beam.

The rendering and domain constraints are fixed. DOM only, no canvas ([ADR-002](ADR-002-dom-only-rendering.md)).
`src/game` is pure: no React, DOM, storage, network, timers, `Date.now`, or `Math.random`
([ADR-003](ADR-003-pure-game-domain.md)). The game must stay legible and playable on a low-end phone.
A React component per enemy, or per-frame React state for positions, would reconcile dozens of nodes
every frame and allocate during play. The design needs one coordinate model, one deterministic time
step, a bounded pool, and an imperative render path.

## Decision

**Viewport coordinate model.** Enemies live in viewport space, in a fixed, full-bleed enemy layer
measured by its own bounding client rect in CSS px, origin at the top-left. The layer is the
simulation's world. The arena outline is decorative: it never blocks an enemy or a beam. The
composition measures the arena's inner content box and projects the player's center into the layer as
`(arena.left + player.x, arena.top + player.y)`. The player's hurtbox is the axis-aligned 0.8 ×
visual-edge square projected into the same space.

Do not use `window.innerWidth`/`innerHeight` or `visualViewport`; pinch zoom is not a supported play
state. Safe-area insets are not subtracted from the layer: the arena is centered in the safe
playfield, so the player never stands under a notch, and the 64 px spawn margin keeps entries
off-screen. Every spawn starts fully outside the layer by at least 64 px on one of the four edges, at
a 10–90% along-edge position, never at a corner.

Active enemy positions are absolute layer coordinates. A resize never reprojects them. The
composition debounces measurements by 200 ms; new spawns and culling use the settled rect. A shrink
can recycle an entered enemy that is now outside the inflated rect; a grow can reveal an off-screen
enemy without teleporting it. A degenerate viewport (width or height ≤ 2 × the 64 px margin) aborts
spawns while the clock and points continue.

**Fixed 20 ms step.** The composition owns an integer 20 ms (50 Hz) accumulator. The raw animation
delta is clamped to 50 ms, floored to integer milliseconds, and at most 3 steps run in one frame; the
sub-millisecond remainder is retained between frames. `stepEnemies` receives:

- the absolute step-end active time (`stepEndMs`),
- the current viewport rect,
- the player's projected hurtbox,
- whether the player is alive.

The world stores absolute active-time thresholds, not a second clock. The run's `elapsedMs` is
authoritative for points and the timeline; enemy time is quantized to 20 ms and never exceeds it.
Newly spawned enemies do not move or collide in their spawn step. The step order is fixed: move,
resolve damage, mark entry/recycle, advance spawn timers and attempt spawns.

**Pure domain, fixed pool.** The domain is a pure value plus transitions:

- `src/game/enemy-world.ts` — the fixed 24-slot world, spawn/recycle, caps, freeze, resize, RNG
  cursors, and the one-hit-per-step boundary.
- `src/game/enemy-spawn.ts` — side mapping, along-edge band, same-kind spacing shift, and shared
  attempt gates.
- `src/game/enemy-collision.ts` — swept red segment vs. hurtbox, rotated lane vs. square SAT,
  contact-time ordering, and the one-hit-per-step rule.
- `src/game/enemy-red-square.ts` and `src/game/enemy-orange-triangle.ts` — per-kind records and
  step/spawn behavior, owned by their specs.

`stepEnemies` returns the next world plus at most one hit intent. The run composition applies
`applyDamage` once and calls `endRun` on death. The enemy world never reads a clock, storage, or React.
No physics library is used.

**Pool and caps.** Exactly 24 body slots, 2 warning nodes, and 2 beam nodes are preallocated: 28
animated nodes total `[unverified]` DOM budget. The lowest-index free slot is reused; a kind change
resets every field, including phase, aim, lane, damage flag, and entered flag. The caps are 24 active
total, 12 red, 5 triangle, and 2 simultaneous warnings; the numbers are `[unverified]`, but the
skip-never-evict policy is the decision. A spawn at a cap, a full pool, or an invalid placement is
skipped. It is never queued and never evicts an active enemy. The cadence timer still advances; a
skipped attempt draws no RNG. Post-hit invulnerability is 500 ms `[unverified]`. At most one hit is
accepted per 20 ms step, ordered by contact time and then lower slot id. Triangle body contact never
damages; only the laser does, once, at the fire instant.

**Imperative DOM pool.** The enemy layer is `aria-hidden`, `pointer-events-none`, non-interactive,
and does not take focus. Each pooled node is positioned with a transform and changed with opacity.
The pool is written imperatively, at most once per animation frame. There is no per-enemy React
component, no per-frame React state, no per-enemy event listener, no per-frame layout read, and no
node allocation after world creation. The layer switches a node's kind presentation without
remounting the layer.

**Freeze and death.** While any freeze reason is present (`pause`, `hidden`, `portrait`, `focus`), the
composition does not call `stepEnemies`. No spawn, movement, aim, charge, warning, beam, collision,
recycle, or invulnerability time advances. Thresholds are absolute active time, so resume continues
with the remaining active time. There is no catch-up and no skipped resolution. On death the layer
freezes in place under the run-over; nothing despawns, fades, or fires after death. Retry creates a
new empty world. Back to title unmounts the layer. No enemy state is persisted.

**Determinism.** One uint32 run seed is supplied by the app. Two independent streams are derived once:

- `redSeed = (seed + 0x9e3779b9) >>> 0`
- `triangleSeed = (seed + 0xc2b2ae35) >>> 0`

Each stream stores its cursor in the world. Draw order is fixed per kind; a skipped attempt draws
nothing; a kind change or a new draw in one stream does not shift the other. Player positions,
viewport rects, and the active/inactive step sequence are replay inputs; the seed alone is not
enough to reproduce a run. All randomness is non-cryptographic and non-networked; `Math.random` never
appears in the domain.

## Options considered

- **Arena-space enemies.** Spawn and travel inside or around the 320 px container. Con: loses the
  “threats come from outside the player's world” pressure; the arena outline becomes a spawn and
  collision obstacle; on a desktop viewport most of the screen is unused. Rejected.
- **Mutable engine or class-based world.** A familiar game loop with internal mutation. Con: hidden
  state, harder to serialize, test, and replay; encourages the domain to reach for time or storage;
  conflicts with ADR-003. Rejected.
- **Per-enemy React components with per-frame state.** Declarative and familiar. Con: reconciliation
  and allocation for up to 24 bodies plus warnings and beams, per-frame React state, and DOM churn;
  the brief explicitly wants a continuous layer, not components popping in and out. Rejected.
- **Canvas or WebGL.** The usual answer for many moving sprites. Con: prohibited by ADR-002; loses
  DOM inspectability, accessibility, and Testing Library coverage. Rejected.
- **One shared RNG stream for both kinds.** Simpler state. Con: adding a triangle draw would change
  red-square outcomes, breaking replay stability and defect isolation. Rejected.
- **Per-kind pools or per-kind layers.** More isolation. Con: more bookkeeping and more nodes for no
  benefit at 24 slots; one shared pool with per-kind caps is simpler and still bounded. Rejected.
- **Viewport-space shared pool, fixed 20 ms step, imperative DOM reuse (chosen).** Keeps the arena
  small and legible, keeps collision in one coordinate space, and meets the DOM and purity
  constraints.

## Rationale

The arena is the player's world, but the screen is where threats come from. Viewport space lets a
threat cross the whole display and still collide with the player's projected position; it keeps the
arena outline decorative and the collision rule independent of the viewport. A fixed 20 ms step
decouples simulation from render rate, makes thresholds and collision testable, and matches the
per-kind timing values. A pure world plus an imperative DOM pool is the only combination that
satisfies DOM-only, pure-domain, and the 28-node budget at once. Reusing nodes avoids the popping and
reconciliation cost of per-enemy components, and separate RNG streams make the replay contract stable
as enemy kinds are added.

## Consequences

- The composition owns measurement, the 200 ms resize settle, the frame clamp, the 20 ms accumulator,
  freeze gating, the single hit intent, and death. The world owns only rules.
- 28 animated nodes is the ceiling. Measure the 24-active-enemy case on the low-end reference phone
  `[unverified]`. If a future design needs thousands of nodes, stop and write an RFC; do not add
  canvas.
- The 20 ms quantization means a charge, fire, or beam can resolve up to 19 ms after its nominal time.
  Tests must assert the resolving step; the UI must not promise millisecond-exact animation.
- Active positions are not reprojected on resize. A shrink can recycle an entered enemy; a grow can
  reveal one without teleporting it. The 30 s safety lifetime frees a pathologically stuck slot.
- Death freezes the layer in place; the run-over covers it. There is no cleanup, fade, or despawn.
- Enemy state is ephemeral. Do not add enemy fields to `shapebound:save`; a future active-run save is
  a new scope decision and migration.
- The per-kind specs remain the source of behavior and balance. This ADR fixes the shared coordinate,
  time, pool, and rendering model; every balance value remains `[unverified]`.
- When the code lands, update `docs/architecture.md#game-domain`,
  `docs/architecture.md#rendering-constraints`, `docs/components.md`,
  `docs/design-system.md#play-surface`, `docs/game-design.md`, `docs/runbook.md`, and the memories.
