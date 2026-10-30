# Game design

> **Status: provisional vision, survival run slice implemented.** The author supplied the direction
> below on 2026-10-23. It is intentionally incomplete and may change. The landscape board, movement,
> barrier-backed player domain, active-time run, blue-point scoring, enemy threats, HUD, pause, death
> commit, run-over, save v2, the interactive add-only skill tree with Reset Skills, the reflect
> shield's input/aim/charge/ring/notch visuals, beam reflection, instant reflected-beam kills,
> reflected-path previews, shape-matched explosions, and the 5% barrier drop are implemented. Boss
> entities and fights, boss currency awards, direct player attack, a win condition, and active-run
> persistence are not. Unimplemented or unanswered mechanics remain `TODO` or open questions.

## Design pillars

_What should every mechanic reinforce? Three to five short principles._

- <!-- TODO: pillar 1 -->
- <!-- TODO: pillar 2 -->
- <!-- TODO: pillar 3 -->

## Vision (provisional)

Shapebound is a single-player, offline **roguelike survival** game built from DOM elements and CSS.
The player survives a run, earns points, dies, and spends those points on a node tree that makes the
next run stronger.

- **Blue points** are the default currency. The player earns **1 blue point per second alive**. A
  completed run banks its points at death; the current run's points are not live in `/skills`.
- **Boss currencies** come in three colors: **purple**, **green**, and **orange**. They are reserved
  as semantic identities (`boss-purple`, `boss-green`, `boss-orange`) and shown as zero rows. No boss
  can be defeated and no boss currency is awarded, spent, or fabricated in this slice.
- **Skill tree (implemented).** Four branches contain seven known nodes plus locked placeholders.
  Each level costs 1 blue point; levels are add-only and cannot be removed individually. `/skills` has
  a Reset Skills action with in-app confirmation, disabled when no levels are purchased, that clears
  all seven levels and refunds the sum spent, capped at `MAX_BLUE_POINTS`. `/skills` is interactive
  and writes save v2 through the progression port.
- At the start, without upgrades, the player is **slow, big, and has 1 health point and 0 barrier**.
  Upgrading can make the player faster, smaller, and tougher.
- **Barrier (implemented).** The player always has exactly 1 health point; Barrier Count adds 0–3
  extra barrier charges. A run starts with full barrier, damage consumes barrier before health, and
  barrier does not regenerate. Up to three 5 × 2 px notches on the player's top edge show the current
  count; a barrier-absorbed hit empties one and plays a 120 ms outline cue (omitted under reduced
  motion). A normal-enemy defeat rolls the dedicated 5% `[unverified]` drop stream once; a success
  fills one notch, clamped to the cap. The old health-point `shield` name is renamed `barrier`; the
  reflect shield is a separate mechanic.
- **Reflect shield (implemented).** A 64 px line orbits the player while held. On desktop, hold the
  right mouse button and aim with the mouse. On touch, the first finger moves and a second finger aims
  the shield. The line is tangent at `playerSize / 2 + 14` px from the player center, and the charge
  ring inside the player shows the current charges and recharge progress. Charges start full; a beam
  that hits the outer face first is reflected along `r = d − 2(d·n)n`, spends one charge, and resolves
  as an instant 12 px cyan beam. The beam kills up to `1 + Laser Pierce` normal enemies in distance
  order, passes through all allowed targets, and continues to the viewport edge when pierce remains
  spare. Each kill plays a shape-matched explosion and rolls the 5% barrier drop. Charging warning
  lanes that would reflect draw dim preview paths. A beam does not damage the player or a boss, and
  the shield never blocks triangle body contact.
- The player has no direct attack and no aiming reticle. The reflect shield is the only player damage
  source; bosses remain untargetable and cannot be defeated in this slice.
- The player is confined to a **static, outlined square container** centered on the board. The
  screen is not a collision boundary; the container is the play arena. Upgrades can increase its
  size.
- Input: keyboard (WASD and arrow keys) plus touch movement. The shield is right mouse on desktop or
  a second touch on mobile; there is no keyboard parry. Mouse and touch shield sources never drive
  the shield at the same time.
- Screen: the play board fills the screen and is **landscape-only**. Portrait freezes the run and
  covers it with a gate; the title, settings, skills, and other presentation pages are responsive in
  both orientations.

## Core loop

1. Start a run. **Implemented**, but a new run requires a readable (`none` or `valid`) save; an
   unreadable or unavailable read shows the save gate and creates no run.
2. Survive; blue points accrue at 1 per second alive. **Implemented.** A warning lane that hits the
   shield's outward face before the player reflects as an instant cyan beam; it can kill normal
   enemies, play a shape-matched explosion, and roll the 5% barrier drop. Preview lanes show where
   charging warnings will reflect.
3. Defeat color-coded bosses for their currencies. **Not implemented**; five-minute boss markers and
   a banner are placeholders only. Reflected beams do not damage bosses.
4. Die (the exact death or win condition is still open). **Death is implemented; a win condition is
   not.**
5. Spend points in the add-only node tree or reset the tree for a full refund. **Implemented** on
   `/skills`; purchases and reset write save v2 outside a run.
6. Start the next run stronger. **Implemented** through the captured run loadout (speed, player size,
   arena size, max barrier, reflect charge settings, and pierce). Reflection, instant beams, previews,
   and the barrier drop use that captured loadout.

<!-- TODO: define how bosses appear and are defeated, and whether a run can be won. -->

## Mechanics

| Mechanic                                    | Status                                                                        | Spec                                                 | Docs                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Player movement (keyboard + touch joystick) | Implemented                                                                   | `.ai/specs/mechanics/player-movement.md` (local)     | [Architecture](architecture.md#game-domain)                   |
| Player container (static outlined arena)    | Implemented                                                                   | Same local spec                                      | [ADR-009](../decisions/ADR-009-static-player-container.md)    |
| Landscape-only play surface                 | Implemented; portrait pauses                                                  | Same local spec                                      | [ADR-013](../decisions/ADR-013-portrait-pause.md)             |
| Active-time run clock and `mm:ss:cc` timer  | Implemented                                                                   | `.ai/specs/run-slice-architecture.md` (local)        | [Architecture](architecture.md#game-domain)                   |
| Survival scoring (blue points)              | Implemented; 1 per active second                                              | Same local spec                                      | [ADR-011](../decisions/ADR-011-progression-save-v1.md)        |
| Enemy threats (red square, orange triangle) | Implemented; values unverified; instant reflected beams defeat normal enemies | `.ai/specs/mechanics/enemy-system.md` (local)        | [ADR-012](../decisions/ADR-012-viewport-enemy-simulation.md)  |
| Barrier buffer (1 HP + 0–3 barrier)         | Implemented in the domain, player notches, and 5% drop                        | `.ai/specs/mechanics/barrier.md` (local)             | —                                                             |
| Reflect shield and instant beams            | Implemented: input/aim, ring, line, reflection, previews, pierce, shapes      | `.ai/specs/mechanics/reflect-shield.md` (local)      | [ADR-018](../decisions/ADR-018-reflected-shot-combat-step.md) |
| Run HUD, timeline, and boss banner          | Implemented; banner is a marker                                               | Same local spec                                      | [Architecture](architecture.md#game-domain)                   |
| Pause, freeze, and run-over                 | Implemented                                                                   | Same local spec                                      | [ADR-013](../decisions/ADR-013-portrait-pause.md)             |
| Progression save and death commit           | Implemented; v2 record with v1 read migration; upgrades preserved             | Same local spec                                      | [ADR-017](../decisions/ADR-017-progression-save-v2.md)        |
| Bosses and boss currencies                  | Planned; no entity or award                                                   | —                                                    | [ADR-011](../decisions/ADR-011-progression-save-v1.md)        |
| Node tree / meta progression                | Implemented: add-only purchases, Reset Skills, captured loadout               | `.ai/specs/mechanics/skill-tree-upgrades.md` (local) | [ADR-019](../decisions/ADR-019-skill-tree-reset-all.md)       |
| Direct player attack / win condition        | Not implemented; reflect shield is separate                                   | —                                                    | —                                                             |
| Active-run persistence / resume             | Not implemented                                                               | —                                                    | [ADR-011](../decisions/ADR-011-progression-save-v1.md)        |

When a mechanic lands:

1. Run `.ai/skills/design-a-mechanic/SKILL.md`.
2. Add a row here with a one-paragraph current-state summary.
3. Link its spec until promotion; remove the spec after the rules are folded in.
4. Record any hard-to-reverse choice as an ADR.

## Content model

_Provisional._ Content is expected to be organized as:

- **Run** — one survival attempt, from start to death or another end condition. Runs are in memory
  only; there is no mid-run save.
- **Currency** — blue (survival) and purple/green/orange (reserved boss drops). Boss balances are
  stored in the v2 record with upgrade levels; there is no boss award or spend, and normal play keeps
  them at zero.
- **Boss** — one color-coded encounter per boss currency. Only the five-minute marker and banner
  exist; there is no boss entity, health, attack, or defeat.
- **Node tree** — implemented: four branches, seven known nodes plus locked placeholders. Each level
  costs 1 blue point; levels are add-only. `/skills` has a Reset Skills action with in-app
  confirmation, disabled when no levels are purchased; it clears all seven levels and refunds the sum
  spent, capped at `MAX_BLUE_POINTS`. There is no individual removal. The seven known nodes are
  Barrier Count, Movement Speed, Player Size, Arena Size, Reflect Charges, Charge Speed, and Laser
  Pierce.
- **Player stats** — movement speed, size, and barrier are implemented in the domain and captured
  from saved upgrades at run start. The player always has exactly 1 health point; `Barrier Count`
  sets max barrier (0–3), a run starts full, and damage consumes barrier before health. The old
  health-point `shield` is renamed `barrier`. Barrier notches on the player's top edge are the
  visual; there is no separate barrier HUD.
- **Reflect shield** — a separate 64 px parry line with 0–3 charges and a 4–2 s recharge curve.
  Input/aim, the cyan shield line, charge ring, barrier-notched player, outer-face first-contact
  reflection, instant 12 px beams, reflected-path previews, pierce, shape-matched explosions, and the
  5% barrier drop are implemented. Charges are spent one per reflected beam; a held input that
  reaches 0 stays spent until release and re-press.
- **Player container** — a static, outlined square arena; starting size 320 px `[unverified]`.
  Container size is an intended skill-tree upgrade.
- **Progression record** — v2: `bluePoints`, `bestTimeMs`, `runCount`, the three boss currency
  balances, and the seven upgrade levels. A valid v1 record is read through a linear in-memory
  migration with zero upgrades; reading does not rewrite it. Death commits and tree transactions write
  v2 once. The record does not contain the seed, clock, enemy state, current run points, barrier,
  reflect charges, beams, or previews.

<!-- TODO: define node data, content authoring, future boss content, and any active-run save. -->

## Balance philosophy

- No fake precision. A value that has not been playtested is tagged `[unverified]`.
- Prefer a small number of legible values over a spreadsheet of hidden modifiers.
- Every random outcome must be reproducible from the run seed plus the recorded inputs (player
  positions, viewport/arena rects, and active/inactive step sequence). The seed alone is not enough.
- Balance changes need a playtest hypothesis, not just a feeling.
- The current slice uses provisional values: 64 px player, 180 px/s, 1 HP and 0 barrier at level 0, a
  320 px arena `[unverified]`, a 1-point-per-second score, a five-minute boss marker cadence, and
  unverified enemy speeds, caps, warning widths, and damage timings. The seven skill-tree curves and
  the one-point cost are implemented but remain `[unverified]` until playtested. The reflect shield
  input, aim, charge ring, barrier notches, first-contact reflection, instant 12 px beams,
  reflected-path previews, 0.35 grazing epsilon, 180 ms beam linger, 450 ms shape-matched explosions,
  and 5% barrier drop are implemented; the combat values remain `[unverified]` until playtested.

## Input and accessibility

- **Landscape play, responsive presentation.** The title, settings, skills, and not-found pages
  respond to portrait and landscape. Only `/play` is landscape-gated. In portrait the run freezes
  behind a blocking gate; returning to landscape removes the gate, opens the pause menu once, and
  waits for Resume. There is no auto-resume.
- **Touch start.** On touch devices, `/play` requests fullscreen and a best-effort orientation lock
  on the start tap; where the browser cannot lock (notably iOS/Safari), the rotate overlay is the
  fallback.
- **Keyboard:** WASD and arrow keys move the player; diagonal speed is not faster. Escape opens the
  pause menu when the run is active and the menu is closed. There is **no keyboard parry**; the shield
  is mouse/touch only, an author-approved accessibility exception.
- **Desktop shield:** hold the right mouse button on the play surface and aim with the pointer. Release,
  cancel, blur, hidden tab, pause, portrait, or death disengages; left clicks do nothing; the surface
  context menu is prevented. Right-clicking the pause control does not engage or pause.
- **Touch:** the first non-mouse pointer moves; a second simultaneous pointer aims the shield only
  when charges are available. Movement can lift while the shield stays latched; the next touch becomes
  movement. Lifting the shield hides it immediately. A third pointer and level-0 second touches are
  ignored, and mouse pointers never create touch joysticks.
- **HUD:** the run HUD overlays the board with no reserved band. It shows the timer, blue points, a
  320 px timeline, a boss-marker banner, and a pause button. The player-local charge ring and barrier
  notches are displayed on the player, not in the HUD; the shield line, instant reflected beams,
  preview lanes, and explosions live in the viewport-space combat layer. There is no separate barrier
  HUD.
- **Container boundary.** The player is confined to the static outlined container; the screen is not
  a collision boundary. The container outline is decorative and the player state is the source of
  truth.
- **Enemies.** Threats live in viewport space, so they enter from outside the arena; the arena
  outline never blocks them. Red squares aim once and travel straight. Orange triangles stop, lock an
  aim, charge a hatched lane, and fire a hitscan beam once. Current test tuning aligns triangle
  spawns with red (first at 2 s, 900 ms cadence, target capped at 12); confirm the final cadence after
  playtest. Both enemy kinds damage on body contact; a triangle body hit marks that activation so it
  cannot hit twice. An active shield reflects a lane only when the lane approaches its outer face and
  is contacted before the player hurtbox (ties reflect). The instant cyan beam kills normal enemies,
  passes through all allowed targets, continues to the viewport edge when pierce remains spare, and
  plays a shape-matched explosion. Reflected beams do not damage bosses.
- **DOM-only.** No canvas or WebGL. Motion uses transforms; the player is clamped to the container's
  inner bounds. The enemy layer is a bounded pool of 48 DOM nodes; the combat layer adds one shield
  line, 6 instant beams, 6 preview lanes, and 12 explosions, and the player adds one charge ring and
  one barrier-notch group, for 75 in-run animated roots.
- **Reduced motion:** decorative animation is disabled; essential gameplay and clock movement
  remains. The boss banner's glitch strip, the 120 ms barrier-hit outline, and explosions are
  omitted.
- **Color is not the only signal.** HUD and status UI include text or shape, not color alone.

## Open questions for the author

- **Boss defeat:** Normal enemies can be killed by instant reflected beams in the approved design,
  but bosses still have no defeat path. How are bosses defeated?
- **Run end:** Is a run endless until death, or is there a win condition?
- **Boss cadence and behavior:** Five-minute markers exist, but when do real bosses appear, and what
  do they do?
- **Skill-tree balance:** The four-branch, seven-node, add-only layout and the Reset Skills rule are
  implemented ([ADR-019](../decisions/ADR-019-skill-tree-reset-all.md)). The seven curves and the
  one-point-per-level economy remain `[unverified]` until playtested; confirm them after the first
  playtest.
- **Reflect shield balance:** The 4 s base recharge, 0.35 grazing epsilon, 12 px instant reflected
  beam, 180 ms beam linger, 5% barrier drop, and the other approved starting values are `[unverified]`
  but implemented. Confirm the feel of the parry, the instant pierce, the preview, and the drop rate
  after playtest.
- **Barrier:** Barrier does not regenerate; the only in-run gain is the 5% normal-enemy drop, now
  implemented. Confirm the survivability loop after the reflect shield is playtested.
- **Currency persistence:** What happens to unspent points on death? Are all points meta-currency?
- **Board:** Is the arena always one fixed screen, or can it scroll or resize with difficulty?
- **Enemy tuning:** Are the current red-square and orange-triangle cadences, caps, and telegraphs the
  intended long-run difficulty curve?
