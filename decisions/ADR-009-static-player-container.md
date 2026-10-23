# ADR-009 — Static outlined player container as the play boundary

- **Status:** Accepted
- **Date:** 2026-10-23
- **Topic:** game domain / play surface
- **RFC:** —
- **Supersedes:** [ADR-008](ADR-008-responsive-presentation-landscape-play.md)

## Context

ADR-008 bounded the player by the safe playfield intersected with the visible viewport. That kept
the player on screen, but the screen itself was still the play boundary. The author has now defined a
new key feature: a static, outline-only square container centered on the board, with the player
inside it. The screen is no longer a collision boundary. The container is the player's arena, and one
of the skill-tree upgrades will increase its size.

## Decision

- **Static container.** Render a square outline centered in the safe playfield. It is not filled, it
  does not move, and the player is a DOM child of its inner content.
- **Container is the only player boundary.** The domain receives the container's inner bounds; the
  player is clamped to that box. Remove the safe-playfield and visible-viewport collision logic from
  the player loop.
- **Starting size.** `PLAYER_CONTAINER_SIZE = 320` px `[unverified]`. The size is a single balance
  value and a future skill-tree upgrade target; it can be tuned without changing the boundary model.
- **Resize/upgrade behavior.** The container is centered by CSS and remains static. The player loop
  re-measures the container when its size prop changes, so a future upgrade can grow the arena and
  clamp the player to the new bounds.
- **Rendering.** The container is an outline only (`border-2 border-cyan/60 shadow-glow-cyan`), with
  the acid player square inside. The glow is subtle and does not fill the container. It is decorative
  (`aria-hidden`); the play instructions describe the boundary.

## Options considered

- **Keep the safe-playfield/visual-viewport bounds (ADR-008).** Con: the screen is the boundary, so
  there is no limited arena and no meaningful container-size upgrade.
- **Responsive container sized from the viewport.** Con: the upgrade size would not be a stable,
  legible value; the arena would change with the device.
- **Independent container entity with a clipping layer.** Con: more moving parts than the current
  slice needs; a DOM child plus domain bounds is enough.
- **Static DOM child container (chosen).** Simple, inspectable, and directly expressible in the DOM;
  the domain remains the source of truth for collision.

## Rationale

A fixed arena makes the movement space legible and gives the skill tree a concrete upgrade axis. The
container is the player's world, not the viewport, which keeps the game rules independent of browser
chrome and screen size. The DOM structure mirrors the rule: the player is inside the container, and
the domain clamps it to the container's inner bounds.

## Consequences

- The player can no longer reach the screen edges; it stops at the container outline.
- On very small viewports the 320 px container may exceed the safe playfield. That is a tuning issue,
  not a collision rule; adjust `PLAYER_CONTAINER_SIZE` or the supported viewport floor when measured.
- ADR-008 is superseded. Its play-only landscape gate, responsive presentation, start/fullscreen
  fallback, and imperative joystick knob remain in force through this ADR.
- The player loop no longer needs `visualViewport`, document-client, or fullscreen resize bounds.
- The domain `Bounds` contract remains generic and still supports an origin for future layouts.
- Container size is a balance value; it is tagged `[unverified]` until playtested.
- Docs and memories updated: architecture, game design, components, design system, runbook, overview,
  README, AGENTS, and `.ai/memories/*`.
