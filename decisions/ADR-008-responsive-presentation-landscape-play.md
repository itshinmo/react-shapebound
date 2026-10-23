# ADR-008 — Responsive presentation, landscape-only play screen

- **Status:** Superseded by ADR-009
- **Date:** 2026-10-23
- **Topic:** routing / orientation / presentation
- **RFC:** —
- **Supersedes:** [ADR-007](ADR-007-landscape-only-play-surface.md)

## Context

ADR-007 made the whole app landscape-only, including the title screen, settings, and not-found route.
The author has changed that decision: those pages are the landing and presentation surface and must
stay responsive in both portrait and landscape. Only the game board must be played horizontally.

The play screen still needs the best-effort fullscreen and orientation-lock path from ADR-007. On
mobile Firefox, entering fullscreen can produce a layout viewport that is larger than the visible
screen, especially around a camera cutout. The player must be bounded by the visible viewport, not
the full layout viewport. On the same device, the joystick knob was updated through React state on
every pointer move, which lagged behind fast finger movement while the player movement itself
(updated through a ref) stayed immediate.

## Decision

- **Play-only landscape gate.** `LandscapeGate` and `useLandscape` move from `src/app/` to
  `src/features/play/`. The gate wraps only `PlayScreen`; the title, settings, and not-found routes
  render normally in portrait and landscape.
- **Play-screen orientation behavior is unchanged in intent.** On touch devices, `/play` shows the
  one-tap start overlay that requests fullscreen and attempts
  `screen.orientation.lock('landscape')`. Failure is non-blocking; the rotate overlay is the
  fallback. No PWA, manifest, service worker, or native wrapper is added.
- **Visible-viewport bounds.** The player bounds are the intersection of the safe playfield rect
  with `window.visualViewport`, expressed as `{ left, top, width, height }`. This prevents the
  player from moving into layout-viewport space that the browser does not actually show in
  fullscreen, including the mobile Firefox cutout case.
- **Imperative joystick knob.** The joystick vector is written to a ref for the player loop, and the
  knob transform is written directly to the knob element on `pointermove`. React state changes only
  when the joystick appears/disappears, not on every move. The knob follows the same pointer event
  that moves the player.
- **Presentation pages stay responsive.** The app shell, title, settings, and not-found layouts keep
  their existing responsive classes. The side safe-area insets remain on in-flow screens.

## Options considered

- **Keep the app-wide gate (ADR-007).** Con: landscape-only landing and settings pages contradict the
  presentation requirement and make the app feel broken in portrait.
- **Play-only gate (chosen).** Keeps the game landscape while letting the presentation pages respond
  to the device. Reuses the existing gate and orientation-lock path.
- **CSS rotate the game in portrait.** Con: confusing input mapping, focus, and accessibility; not a
  real orientation lock.
- **Installed PWA or native wrapper.** Con: out of scope; would need a separate orientation and update
  policy.

## Rationale

The landing and settings pages are not the game and should not force a device rotation. The game
itself needs landscape for a fair, predictable playfield. Moving the gate into the play feature
matches the dependency direction: `src/app` remains the composition root, and the feature owns its
platform behavior.

The visual viewport is the browser's authoritative visible area in mobile fullscreen. Intersecting it
with the safe playfield is the smallest correct fix for the Firefox cutout overflow; it also covers
other browsers where the layout and visual viewports diverge. Writing the joystick knob directly is
the same pattern already used for the player: input updates a ref and the DOM immediately, while
React owns structure and infrequent state.

## Consequences

- Title, settings, and not-found are usable in portrait and landscape; only `/play` shows the rotate
  overlay in portrait.
- The app route table no longer wraps every route in the gate. Tests cover the title in portrait and
  the play gate in isolation.
- On `/play`, rotating to portrait unmounts the play surface. Returning to landscape remounts it, the
  player respawns centred, and touch devices show the start overlay again. There is still no run
  state to preserve.
- ADR-007 is superseded in scope. Its play-screen fullscreen fallback, no-PWA policy, and play-surface
  exception carry forward through this ADR.
- Player bounds now carry a `left`/`top` origin; domain tests cover the non-zero-origin case.
- Firefox Android fullscreen, Chrome Android lock, and iOS Safari fallback still need a real-device
  pass; device behavior remains `[unverified]`.
- The joystick knob still needs a real-device feel check. The implementation no longer schedules React
  state per pointer move.
- Docs and memories updated: `docs/architecture.md`, `docs/components.md`, `docs/design-system.md`,
  `docs/game-design.md`, `docs/overview.md`, `docs/runbook.md`, `docs/decisions-not-to-fix.md`,
  `README.md`, `AGENTS.md`, and `.ai/memories/*`.
