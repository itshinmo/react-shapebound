# ADR-007 — Landscape-only play surface and best-effort orientation lock

- **Status:** Superseded by ADR-008
- **Date:** 2026-10-23
- **Topic:** play surface / platform / orientation
- **RFC:** —

## Context

Shapebound is a real-time, single-player, offline browser game. The author requires the game to be
played in landscape only on desktop and mobile, "like all mobile games." The play board fills the
viewport and uses a square player with keyboard and touch movement. Portrait is not a supported
layout.

The web platform cannot guarantee an orientation lock:

- `ScreenOrientation.lock()` is not implemented in Safari/iOS.
- Desktop Chrome exposes the method but always rejects with `NotSupportedError`.
- Chrome Android supports it; it typically requires a fullscreen context.
- Requesting fullscreen requires user activation.
- Fullscreen support for arbitrary page elements is absent or limited on iOS Safari.

The project is offline after load, has no PWA/service worker, and forbids new runtime dependencies
without an ADR. The current `AppShell` adds a global scanline overlay, and the design system says
internal screens use a yellow top bar; a full-bleed play surface is an exception.

## Decision

- **Landscape-only, app-wide.** A `LandscapeGate` blocks the whole app when the viewport is
  portrait. It renders a full-screen "rotate to landscape" overlay instead of the route content.
  The route remounts when the viewport returns to landscape.
- **Best-effort lock on touch.** On touch devices, `/play` shows a one-tap start overlay. The tap
  requests fullscreen on the play surface and attempts
  `screen.orientation.lock('landscape')`. Either step may fail; failure is caught and does not block
  the game. The landscape gate remains the fallback.
- **Desktop starts immediately.** Desktop does not request fullscreen; it is gated by the viewport
  shape and starts on route entry.
- **No PWA or manifest orientation.** A manifest would only affect installed contexts and would
  bring PWA/update policy into scope. A hard lock via a native wrapper is out of scope.
- **No CSS rotation hack.** Rotating the DOM 90 degrees in portrait would confuse touch coordinates,
  focus, and accessibility.
- **The play screen is live.** The approved movement slice replaces the non-functional preview.
  Combat, economy, and the HUD remain out of scope.
- **Play surface exception.** The play screen is full-bleed black with a very faint technical grid
  and no header. The global scanline overlay is hidden on `/play`. The first slice has no HUD and no
  visible exit control; browser back is the exit path until HUD/pause work lands.
- **Unmount on portrait.** The gate replaces the route content. In this slice there is no run state
  to lose; the player respawns centered when landscape returns, and touch devices show the start
  overlay again. If persistent run state arrives, revisit this as an overlay-and-pause gate.

## Options considered

- **CSS-only rotate overlay, no lock.** Works everywhere, no permission prompts. Con: the device can
  stay physically portrait; the player must rotate manually.
- **Fullscreen + `screen.orientation.lock('landscape')` (chosen for touch, best-effort).** Better UX
  on Android Chrome; no dependency. Con: unsupported on iOS/Safari and desktop; requires a gesture.
- **Manifest `orientation: landscape` / installed PWA.** Con: only installed contexts; requires a
  PWA/orientation policy and an ADR; not a browser-tab solution.
- **CSS rotate the game 90 degrees in portrait.** Con: confusing input mapping, text, focus, and
  accessibility; not a real orientation lock.
- **Native wrapper.** Con: out of scope; violates the browser-only product constraint.

## Rationale

The product rule is landscape-only, but the browser cannot enforce physical orientation everywhere.
The honest implementation is a blocking landscape gate plus the strongest available lock. This keeps
the game playable on every supported browser, adds no dependency, and does not pretend iOS can do
something it cannot. The one-tap start is the minimum reliable gesture for fullscreen/lock on
Android, and it doubles as a clear "the game is starting" moment.

## Consequences

- iOS/Safari users must rotate manually; the app cannot force orientation.
- Direct `/play` entries on touch devices require one tap before the run starts.
- Rotating to portrait unmounts the route; the run/player state is not preserved in this slice.
- Narrow desktop windows are blocked by the gate. This is deliberate.
- The global scanline overlay is hidden on `/play`; the board uses `bg-grid` at low opacity.
- A follow-up HUD/pause/exit control will need its own design pass and may add a visible exit path.
- A hard orientation lock or installed orientation still requires a future ADR (PWA or native).
- Verify on Android Chrome and iOS Safari; until then device behavior is `[unverified]`.
- The implementation change updated `docs/architecture.md`, `docs/design-system.md`,
  `docs/components.md`, `docs/runbook.md`, `docs/decisions-not-to-fix.md`, `README.md`,
  `docs/overview.md`, `AGENTS.md`, and the memories.
