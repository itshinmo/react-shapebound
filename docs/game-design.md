# Game design

> **Status: provisional vision, survival run slice implemented.** The author supplied the direction
> below on 2026-10-23. It is intentionally incomplete and may change. The landscape board, movement,
> player stat/health-shield model, active-time run, blue-point scoring, enemy threats, HUD, pause,
> death commit, run-over, and a read-only `/skills` page are implemented. Boss entities and fights,
> boss currency awards, node spending/upgrades, player attack, a win condition, and active-run
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
- The player is intended to spend blue points on node unlocks and upgrades. `/skills` is currently a
  locked preview of a generic 3 × 3 map: every node says `LOCKED`, nothing is purchasable, and there
  are no costs or upgrade effects.
- At the start, without upgrades, the player is **slow, big, and has 1 health point**. Upgrading can
  make the player faster, smaller, and tougher.
- **Health above 1 becomes shield.** While alive, the player always has exactly 1 health point; any
  additional health from upgrades is shield. Damage consumes shield before health. Enemy hits are
  the current damage source.
- For now, the player has no attack and no aiming. They move to dodge enemies and attacks.
- The player is confined to a **static, outlined square container** centered on the board. The
  screen is not a collision boundary; the container is the play arena. Upgrades can increase its
  size.
- Input: keyboard (WASD and arrow keys) on desktop; a touch-anchored joystick on mobile.
- Screen: the play board fills the screen and is **landscape-only**. Portrait freezes the run and
  covers it with a gate; the title, settings, skills, and other presentation pages are responsive in
  both orientations.

## Core loop

1. Start a run. **Implemented.**
2. Survive; blue points accrue at 1 per second alive. **Implemented.**
3. Defeat color-coded bosses for their currencies. **Not implemented**; five-minute boss markers and
   a banner are placeholders only.
4. Die (the exact death or win condition is still open). **Death is implemented; a win condition is
   not.**
5. Spend points in the node tree. **Not implemented**; `/skills` is a read-only locked preview.
6. Start the next run stronger. **Not implemented.**

<!-- TODO: define how bosses appear and are defeated, and whether a run can be won. -->

## Mechanics

| Mechanic                                    | Status                           | Spec                                             | Docs                                                         |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Player movement (keyboard + touch joystick) | Implemented                      | `.ai/specs/mechanics/player-movement.md` (local) | [Architecture](architecture.md#game-domain)                  |
| Player container (static outlined arena)    | Implemented                      | Same local spec                                  | [ADR-009](../decisions/ADR-009-static-player-container.md)   |
| Landscape-only play surface                 | Implemented; portrait pauses     | Same local spec                                  | [ADR-013](../decisions/ADR-013-portrait-pause.md)            |
| Active-time run clock and `mm:ss:cc` timer  | Implemented                      | `.ai/specs/run-slice-architecture.md` (local)    | [Architecture](architecture.md#game-domain)                  |
| Survival scoring (blue points)              | Implemented; 1 per active second | Same local spec                                  | [ADR-011](../decisions/ADR-011-progression-save-v1.md)       |
| Enemy threats (red square, orange triangle) | Implemented; values unverified   | `.ai/specs/mechanics/enemy-system.md` (local)    | [ADR-012](../decisions/ADR-012-viewport-enemy-simulation.md) |
| Run HUD, timeline, and boss banner          | Implemented; banner is a marker  | Same local spec                                  | [Architecture](architecture.md#game-domain)                  |
| Pause, freeze, and run-over                 | Implemented                      | Same local spec                                  | [ADR-013](../decisions/ADR-013-portrait-pause.md)            |
| Progression save and death commit           | Implemented; v1 record           | Same local spec                                  | [ADR-011](../decisions/ADR-011-progression-save-v1.md)       |
| Bosses and boss currencies                  | Planned; no entity or award      | —                                                | [ADR-011](../decisions/ADR-011-progression-save-v1.md)       |
| Node tree / meta progression                | Locked preview; no spending      | —                                                | [Architecture](architecture.md#routing)                      |
| Player attack / win condition               | Not implemented                  | —                                                | —                                                            |
| Active-run persistence / resume             | Not implemented                  | —                                                | [ADR-011](../decisions/ADR-011-progression-save-v1.md)       |

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
  stored in the v1 record; normal play writes zero.
- **Boss** — one color-coded encounter per boss currency. Only the five-minute marker and banner
  exist; there is no boss entity, health, attack, or defeat.
- **Node tree** — a locked 3 × 3 preview with generic `NODE_01`–`NODE_09` labels. No unlocks, costs,
  or effects are implemented.
- **Player stats** — movement speed, size, and health; health above 1 becomes shield.
- **Player container** — a static, outlined square arena; starting size 320 px `[unverified]`.
  Container size is an intended skill-tree upgrade.
- **Progression record** — `bluePoints`, `bestTimeMs`, `runCount`, and the three zero boss currency
  balances, committed once at death. It does not contain the seed, clock, enemy state, or current
  run points.

<!-- TODO: define node data, content authoring, future boss content, and any active-run save. -->

## Balance philosophy

- No fake precision. A value that has not been playtested is tagged `[unverified]`.
- Prefer a small number of legible values over a spreadsheet of hidden modifiers.
- Every random outcome must be reproducible from the run seed plus the recorded inputs (player
  positions, viewport/arena rects, and active/inactive step sequence). The seed alone is not enough.
- Balance changes need a playtest hypothesis, not just a feeling.
- The current slice uses provisional values: 64 px player, 180 px/s, 1 HP and 0 shield, a 320 px
  player container `[unverified]`, a 1-point-per-second score, a five-minute boss marker cadence, and
  unverified enemy speeds, caps, warning widths, and damage timings.

## Input and accessibility

- **Landscape play, responsive presentation.** The title, settings, skills, and not-found pages
  respond to portrait and landscape. Only `/play` is landscape-gated. In portrait the run freezes
  behind a blocking gate; returning to landscape removes the gate, opens the pause menu once, and
  waits for Resume. There is no auto-resume.
- **Touch start.** On touch devices, `/play` requests fullscreen and a best-effort orientation lock
  on the start tap; where the browser cannot lock (notably iOS/Safari), the rotate overlay is the
  fallback.
- **Keyboard:** WASD and arrow keys move the player; diagonal speed is not faster. Escape opens the
  pause menu when the run is active and the menu is closed.
- **Touch:** a joystick appears at the touch point, follows the finger, and disappears on release.
  It is a visual indicator, not a separate control.
- **HUD:** the run HUD overlays the board with no reserved band. It shows the timer, blue points, a
  320 px timeline, a boss-marker banner, and a pause button. Health and shield are modeled in the
  domain but are not displayed yet.
- **Container boundary.** The player is confined to the static outlined container; the screen is not
  a collision boundary. The container outline is decorative and the player state is the source of
  truth.
- **Enemies.** Threats live in viewport space, so they enter from outside the arena; the arena
  outline never blocks them. Red squares aim once and travel straight. Orange triangles stop, lock an
  aim, charge a hatched lane, and fire a hitscan beam once. The player has no attack; all threats are
  indestructible.
- **DOM-only.** No canvas or WebGL. Motion uses transforms; the player is clamped to the container's
  inner bounds. The enemy layer is a bounded pool of 28 DOM nodes.
- **Reduced motion:** decorative animation is disabled; essential gameplay and clock movement
  remains. The boss banner's glitch strip is hidden.
- **Color is not the only signal.** HUD and status UI include text or shape, not color alone.

## Open questions for the author

- **Boss defeat:** How are bosses defeated if the player can only move to dodge and has no attack?
- **Run end:** Is a run endless until death, or is there a win condition?
- **Boss cadence and behavior:** Five-minute markers exist, but when do real bosses appear, and what
  do they do?
- **Skill tree:** What is the node layout, cost curve, upgrade step, and cap for speed, size,
  health, and container size?
- **Shield:** Does shield regenerate or heal? What restores health?
- **Currency persistence:** What happens to unspent points on death? Are all points meta-currency?
- **Board:** Is the arena always one fixed screen, or can it scroll or resize with difficulty?
- **Enemy tuning:** Are the current red-square and orange-triangle cadences, caps, and telegraphs the
  intended long-run difficulty curve?
- **Upgrades:** How do the speed, size, and health upgrades interact with shield conversion?
