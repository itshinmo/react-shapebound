# Game design

> **Status: provisional vision, first movement slice implemented.** The author supplied the direction
> below on 2026-10-23. It is intentionally incomplete and may change. The movement slice, landscape
> gate, and player stat/health-shield model are implemented; combat, economy, the boss loop, and the
> node tree are not. Unimplemented or unanswered mechanics remain `TODO` or open questions.

## Design pillars

_What should every mechanic reinforce? Three to five short principles._

- <!-- TODO: pillar 1 -->
- <!-- TODO: pillar 2 -->
- <!-- TODO: pillar 3 -->

## Vision (provisional)

Shapebound is a single-player, offline **roguelike survival** game built from DOM elements and CSS.
The player survives a run, earns points, dies, and spends those points on a node tree that makes the
next run stronger.

- **Blue points** are the default currency. The player earns **1 blue point per second alive**.
- **Boss currencies** come in three colors: **purple**, **green**, and **orange**. There are three
  bosses in the same colors; each drops its matching currency when defeated. The palette has orange;
  purple and green are not semantic tokens yet. Add them with a design note when the currency UI
  lands.
- The player spends blue points to unlock and upgrade nodes. Some paths are locked behind a boss
  currency, so advancing the tree requires defeating the matching boss.
- At the start, without upgrades, the player is **slow, big, and has 1 health point**. Upgrading can
  make the player faster, smaller, and tougher.
- **Health above 1 becomes shield.** While alive, the player always has exactly 1 health point; any
  additional health from upgrades is shield. Damage is expected to consume shield before health.
  There is no damage source yet.
- For now, the player has no advanced combat mechanics. They move to dodge enemies and attacks.
- The player is confined to a **static, outlined square container** centered on the board. The
  screen is not a collision boundary; the container is the play arena. Upgrades can increase its
  size.
- Input: keyboard (WASD and arrow keys) on desktop; a touch-anchored joystick on mobile.
- Screen: the play board fills the screen and is **landscape-only**. Portrait is not supported for
  the game. The title, settings, and other presentation pages are responsive in both orientations.

## Core loop

1. Start a run.
2. Survive; blue points accrue at 1 per second alive.
3. Defeat color-coded bosses for their currencies.
4. Die (the exact death or win condition is still open).
5. Spend points in the node tree.
6. Start the next run stronger.

<!-- TODO: define how a run starts and ends, how bosses appear, and how the player defeats them. -->

## Mechanics

| Mechanic                                    | Status                      | Spec                                             | Docs                                                       |
| ------------------------------------------- | --------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Player movement (keyboard + touch joystick) | Implemented; first slice    | `.ai/specs/mechanics/player-movement.md` (local) | [Architecture](architecture.md#game-domain)                |
| Player container (static outlined arena)    | Implemented; first slice    | Same local spec                                  | [ADR-009](../decisions/ADR-009-static-player-container.md) |
| Landscape-only play surface                 | Implemented                 | Same local spec                                  | [ADR-009](../decisions/ADR-009-static-player-container.md) |
| Survival scoring (blue points)              | Planned                     | —                                                | —                                                          |
| Bosses and boss currencies                  | Planned; defeat method open | —                                                | —                                                          |
| Node tree / meta progression                | Planned                     | —                                                | —                                                          |
| HUD                                         | Deferred                    | —                                                | —                                                          |

When a mechanic lands:

1. Run `.ai/skills/design-a-mechanic/SKILL.md`.
2. Add a row here with a one-paragraph current-state summary.
3. Link its spec until promotion; remove the spec after the rules are folded in.
4. Record any hard-to-reverse choice as an ADR.

## Content model

_Provisional._ Content is expected to be organized as:

- **Run** — one survival attempt, from start to death or another end condition.
- **Currency** — blue (survival) and purple/green/orange (boss drops).
- **Boss** — one color-coded encounter per boss currency.
- **Node tree** — unlockable and upgradeable nodes, some gated by boss currency.
- **Player stats** — movement speed, size, and health; health above 1 becomes shield.
- **Player container** — a static, outlined square arena; starting size 320 px `[unverified]`.
  Container size is an intended skill-tree upgrade.

<!-- TODO: define the data shape, content authoring, validation, and save format. -->

## Balance philosophy

- No fake precision. A value that has not been playtested is tagged `[unverified]`.
- Prefer a small number of legible values over a spreadsheet of hidden modifiers.
- Every random outcome must be reproducible from the saved seed and draw order.
- Balance changes need a playtest hypothesis, not just a feeling.
- The first movement slice uses provisional values: 64 px player, 180 px/s, 1 HP and 0 shield, and
  a 320 px player container `[unverified]`.

## Input and accessibility

- **Landscape play, responsive presentation.** The title, settings, and not-found pages respond to
  portrait and landscape. Only `/play` is landscape-gated. On touch devices, `/play` requests
  fullscreen and a best-effort orientation lock on the start tap; where the browser cannot lock
  (notably iOS/Safari), a blocking rotate overlay is the fallback.
- **Keyboard:** WASD and arrow keys move the player; diagonal speed is not faster.
- **Touch:** a joystick appears at the touch point, follows the finger, and disappears on release.
  It is a visual indicator, not a separate control.
- **No HUD in the first slice.** Health and shield are modeled in the domain but not displayed yet.
- **Container boundary.** The player is confined to the static outlined container; the screen is not
  a collision boundary. The container outline is decorative and the player state is the source of
  truth.
- **DOM-only.** No canvas or WebGL. Motion uses transforms; the player is clamped to the container's
  inner bounds.
- **Reduced motion:** decorative animation is disabled; essential gameplay movement remains.
- **Color is not the only signal.** Future HUD and status UI must include text or shape, not color
  alone.

## Open questions for the author

- **Boss defeat:** How are bosses defeated if the player can only move to dodge and has no attack?
- **Run end:** Is a run endless until death, or is there a win condition?
- **Boss cadence:** When do the three bosses appear, and what do they do?
- **Skill tree:** What is the node layout, cost curve, upgrade step, and cap for speed, size,
  health, and container size?
- **Shield:** Does shield regenerate or heal? What restores health?
- **Currency persistence:** What happens to unspent points on death? Are all points meta-currency?
- **Board:** Is the arena always one fixed screen, or can it scroll or resize with difficulty?
- **Enemies:** Are there regular enemies in addition to bosses? How do they attack?
- **HUD and exit:** What should the HUD show, and how should the player pause or leave a run?
- **Upgrades:** How do the speed, size, and health upgrades interact with shield conversion?
