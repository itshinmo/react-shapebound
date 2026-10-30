# ADR-018 — Reflected-beam combat step and bounded combat-layer pools

- **Status:** Accepted; amended 2026-10-30
- **Date:** 2026-10-29
- **Topic:** game domain / rendering
- **RFC:** —
- **Refines:** [ADR-012](ADR-012-viewport-enemy-simulation.md) (the viewport-space, 20 ms fixed-step,
  one-hit-per-step, pure-domain, and imperative-pool rules stand)
- **Rules:** `.ai/specs/mechanics/reflect-shield.md` (local, gitignored)

## 2026-10-30 amendment

The author changed the reflected result from a moving projectile to an **instant reflected beam**:

- The reflected beam is hitscan, 12 px wide, and visible for 180 ms. It uses the same 12 px collision
  lane, starts at the **shield midpoint** (the center of the line), and resolves immediately after
  the enemy damage phase.
- A reflected beam kills `1 + Laser Pierce` normal enemies in distance order. It passes through all
  allowed targets; if the budget is exhausted it stops after the last allowed kill, otherwise it
  continues to the viewport edge.
- A reflection requires the beam to approach the shield's **outward** face and contact it before the
  player hurtbox; an exact tie reflects. If the player is contacted first, the player takes damage.
  The original orange beam is truncated at the shield when reflected and extends to the viewport edge
  when not reflected.
- Two pre-fire preview lanes show the potential reflected paths for charging warning lanes; both are
  shown even with one charge remaining. The preview is a dim 12 px cyan lane.
- Triangle body contact now damages once like a red square. The shield reflects only the laser; it
  does not block body contact.
- Explosions match the defeated enemy silhouette: hollow square or hollow triangle, with the triangle
  rotated to its aim and both scaling from the enemy size to 48 px over 450 ms.
- The bounded pool is now **75** nodes: 48 enemy (36 body + 6 warning + 6 beam) + 1 shield line +
  6 reflected beams + 6 previews + 12 explosions + 2 player groups. No allocation after mount.

The sections below are retained as the original decision record; where they mention moving
projectiles or 43 nodes, this amendment supersedes them.

## Context

ADR-012 fixed the enemy simulation in viewport space, on a fixed 20 ms step, with at most one player
hit accepted per step and a preallocated 28-node animated pool (24 body nodes, 2 warning nodes, and 2
beam nodes). The enemy world owns spawn, movement, fire, and the single hit intent. The layer is
written imperatively at most once per frame.

The reflect shield adds a combat interaction the enemy step did not need before. Every beam fired in a
step must be exposed so the shield can decide which beams are reflected, and the reflection must be
resolved **before** the player damage selection: a reflected beam cannot also be the one hit the
player takes. Reflected beams become moving shots that can kill normal enemies, which adds shot
movement, kill resolution, ordered defeat events, barrier-drop rolls, and a bounded explosion effect.

The existing `stepEnemies` contract returns only one hit and keeps fire events private. Reflection
cannot be resolved before damage without extending that contract. If the world picked the hit first,
a beam that should have reflected would already have damaged the player. If the wrapper picked the
hit, the one-hit-per-step boundary would move out of the world that ADR-012 made authoritative.

The rules, geometry, and balance values live in the local, gitignored
`.ai/specs/mechanics/reflect-shield.md`; the barrier-drop rule lives in
`.ai/specs/mechanics/barrier.md`. This ADR decides the shared step boundary and the bounded rendering
pools, not the mechanic's numbers or UI.

## Decision

**Keep the simulation contract.** The game keeps viewport-space combat, the fixed 20 ms step, at most
one player hit per step, and a pure `src/game` domain. No canvas, no runtime dependency, and no
active-run save are introduced.

**Extend `stepEnemies`.** The world gains an optional shield descriptor:

```ts
{
  segment: ShieldSegment;
  chargesAvailable: number;
}
```

The descriptor is absent or `null` when no shield is active. The world returns:

- `fires` — every beam fired in this step, ascending enemy slot id;
- `reflectedFireSlotIds` — the subset the shield reflects, ascending enemy slot id;
- the existing single `hit`, selected after reflected beams are excluded from the damage candidates.

The world excludes reflected beams from player damage, still selects at most one player hit after that
exclusion, and does not spend charges or mutate shield state. It only uses `chargesAvailable` to bound
how many beams it may mark reflected. This keeps the one-hit boundary in the world and gives the
combat wrapper the fire data it needs.

**Pure combat wrapper.** A pure wrapper in `src/game` owns the combat sequence around the enemy step:

- spend one shield charge per reflected beam, in ascending slot-id order;
- spawn one reflected shot per reflected beam, then move shots and resolve swept hits;
- remove defeated normal enemies, emit ordered defeat events, and roll the barrier drop once per
  defeat in the order defined by the barrier rules;
- return the next combat state, updated enemy world, ordered defeat events, player hit/death result,
  and presentation values.

Reflected shots kill normal enemies only. There is no boss entity, boss health, boss damage, or boss
currency in this slice. The wrapper does not read a clock, storage, or randomness directly; time,
the run seed, and the loadout are inputs.

**Bounded combat-layer pools.** Add 6 instant reflected-beam nodes, 6 preview nodes, and 12 explosion
nodes: 25 total in the combat layer. The player-local shield line, charge ring, and barrier notches add
3 nodes, for 75 in-run animated nodes total (48 enemy + 25 combat + 2 player groups). Every pool is
allocated before mount; nodes are positioned and toggled imperatively at most once per frame. There is
no allocation after mount, no per-frame React state for combat entities, and no canvas.

The previous 28-node figure in ADR-012 is refined by this ADR, not rewritten. ADR-012 remains
accepted; its enemy-layer budget is now 48 nodes (36 body + 6 warning + 6 beam), and the combat layer
adds its own bounded 25-node pool.

## Options considered

- **Keep 28 nodes and reuse enemy nodes for shots and explosions.** Rejected. An enemy slot cannot be
  a shot and an enemy at the same time. Recycling an enemy to host a shot delays that enemy's defeat
  feedback and couples two independent lifetimes; the pool would also need to preserve enemy state
  across a visual effect.
- **Move damage selection out of `stepEnemies` into the wrapper.** Rejected. It contradicts ADR-012's
  world-owns-one-hit boundary. The wrapper would have to re-evaluate lanes, contact order, and
  invulnerability, duplicating rules the world already owns. Extending the result keeps the boundary
  in one place.
- **Separate combat layer with bounded pools (chosen).** The enemy world exposes fire and reflection
  data; a pure wrapper resolves shots, kills, drops, and effects; the DOM layer gets fixed pools for
  shots and explosions. It preserves the ADR-012 step and one-hit rule.
- **Canvas or WebGL.** Rejected by ADR-002. It would lose DOM inspectability, accessibility, and the
  existing imperative-pool test model.
- **No explosions.** Rejected. A kill needs readable feedback, and the author requested the effect.
  Explosions are visual only and have no gameplay effect.

## Rationale

Reflection is a damage-selection decision, not a post-damage animation. The world must therefore
return every beam and the reflected subset before it chooses the player hit; leaving fire events
private would force the wrapper to duplicate or override the one-hit rule. Keeping charge spending and
shot resolution in a pure wrapper separates the enemy world's rules from the shield's combat rules
while preserving determinism. Separate bounded pools avoid stealing enemy slots and make the DOM
budget explicit. The 20 ms step remains the only clock; the resulting quantization is the same
trade-off ADR-012 already accepted.

## Consequences

- `stepEnemies` has a wider result. Existing callers must tolerate `fires` and
  `reflectedFireSlotIds`; a step with no shield returns no reflected beams and the existing single-hit
  behavior is unchanged.
- Reflection and instant kill resolution are quantized to the 20 ms step. A reflection or kill can
  resolve up to 19 ms after its nominal time; tests must assert the resolving step, not a
  millisecond-exact animation.
- The combat layer is bounded at 25 nodes and the in-run total at 75. Measure the 25/75-node case on
  the low-end reference phone `[unverified]`. If a future mechanic needs more nodes, stop and write a
  new decision; do not add canvas or allocate per frame.
- Explosions are visual only. They do not damage, block, or alter defeat order. The oldest explosion
  node is reused when all twelve are active.
- Reflected beams kill normal enemies only. No boss entity, boss health, boss damage, or boss currency
  is added. The barrier drop is rolled by the existing barrier rule, not by this ADR.
- The combat state is ephemeral. Beams, previews, explosions, shield charges, and drop cursors are not
  added to `shapebound:save`; there is no active-run save or resume.
- No new runtime dependency, no canvas, and no new storage key.
- When the code lands, update `docs/architecture.md#rendering-constraints`, `docs/components.md`,
  `docs/design-system.md` glow scope, `docs/game-design.md`, the tests, and the memories. This ADR is
  already indexed in `decisions/README.md`.
