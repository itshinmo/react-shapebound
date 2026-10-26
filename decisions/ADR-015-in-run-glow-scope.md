# ADR-015 — In-run glow scope and intensity utilities

- **Status:** Accepted
- **Date:** 2026-10-26
- **Topic:** design system / glow / accessibility
- **RFC:** —
- **Supersedes:** [ADR-014](ADR-014-semantic-run-colors.md) — glow consumer scope only. ADR-014's
  color roles, values, and non-glow utilities remain in force.
- **Refines:** [ADR-006](ADR-006-cyberpunk-reference-visual-system.md) (glow-intensity behavior only;
  the reference-derived visual identity stands)

## Context

ADR-014 limited `--glow-intensity` to the play-field surfaces (`glow-player`, `glow-arena`,
`glow-joystick`), the two enemy/warning glows, and the static `GlowPreview`. It explicitly kept the
HUD, pause menu, run-over, `/skills`, buttons, panels, the timeline track, and the boss banner on
fixed `shadow-glow-*` treatments.

The run slice changed the surface model. The HUD timeline, boss banner, pause-menu neon connector,
and run-over panel are now part of the in-run experience, not presentation chrome. A player who moves
the glow slider expects the play surface _and its run UI_ to change together; leaving the timeline,
banner, connector, and run-over fixed makes the setting feel arbitrary and splits the run into two
visual systems.

The existing fixed `shadow-glow-*` utilities cannot honor the slider, and the 1 px timeline track and
`clip-diamond` nodes would clip a box-shadow. The run needs intensity-aware chrome utilities, but the
change must not add a settings field or schema version, must keep every surface legible at 0
intensity, and must never make focus visibility depend on the setting.

The author approved the final scope on 2026-10-26: `/settings` glow intensity controls **every in-run
surface**; presentation pages keep fixed glows. This ADR records that decision and the utility
boundary. The color roles and values remain ADR-014's.

## Decision

**Scope.** `--glow-intensity` may be consumed by every in-run surface and by the static preview that
mirrors the run. Presentation pages never read it.

| Surface                       | Utility                                               | Notes                                                             |
| ----------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Arena container               | `glow-arena`                                          | Existing.                                                         |
| Player                        | `glow-player`                                         | Existing.                                                         |
| Joystick                      | `glow-joystick`                                       | Existing.                                                         |
| Red square body               | `glow-enemy`                                          | `currentColor` red.                                               |
| Orange triangle body          | `glow-enemy`                                          | `currentColor` orange.                                            |
| Warning lane (charge)         | `glow-warning`                                        | `currentColor` orange; hatch remains at 0.                        |
| Beam (fire)                   | `glow-warning`                                        | Same rectangle; brighter fill, same utility.                      |
| Timeline track line           | `glow-track`                                          | `text-track`; restrained neutral alpha.                           |
| Timeline future/current nodes | `glow-track`                                          | `text-ink` / `text-boss-*`; past nodes have no halo.              |
| Boss banner plate             | `glow-hud`                                            | Boss `currentColor`; plate stays translucent.                     |
| Pause-menu neon connector     | `glow-hud`                                            | Cyan `currentColor`; the 2 px line remains at 0.                  |
| Run-over panel                | `glow-danger`                                         | Red `currentColor`; follows the clipped silhouette.               |
| Static `GlowPreview`          | `glow-player`/`arena`/`enemy`/`warning`/`track`/`hud` | `--glow-scale: 0.5`; mirrors the run, not the presentation pages. |

**Presentation exception.** The title page, settings page chrome, `/skills`, the site header, and
their buttons and panels keep fixed glows and never consume `--glow-intensity`. The HUD timer/points
text, legend, scrim, menu button, timeline playhead/current ring, pause dialog frame/rail/buttons, and
all focus rings use fixed or no glows. The boss banner, pause connector, and run-over panel are in-run
surfaces and consume the setting; the rest of the HUD and pause chrome does not.

**New utilities.** Add three `@utility` definitions to `src/styles/global.css`; exact values live in
`ui/run-tokens.md`:

- `glow-track` — a `currentColor` `filter: drop-shadow` at a restrained neutral alpha, for the 1 px
  timeline line and the future/current node diamonds. It is used instead of `box-shadow` because the
  thin line and clipped diamonds would lose the halo. `shadow-glow-track` is rejected and unused. The
  playhead and current ring stay crisp cyan with no halo; if a halo is ever added, it must use
  `glow-track`.
- `glow-hud` — the same `currentColor` drop-shadow family with a proposed lower alpha, for the boss
  banner wrapper and the pause-menu neon connector. The wrapper sets `currentColor` (boss color for
  the banner, cyan for the connector).
- `glow-danger` — the same family with a proposed alpha and a slightly larger blur, for a non-scrolling
  outer wrapper around the clipped run-over panel. `drop-shadow` follows the clipped silhouette; a
  box-shadow on a `clip-path` element cannot.

The filter-based utilities create a stacking context. Apply them only to decorative wrappers (track
line, node, banner wrapper, connector, run-over wrapper), never to focusable controls or the
full-screen overlay. Buttons, the menu button, and focus rings keep their fixed or no-glow treatments.

**Accessibility model.** The existing 0–100 glow slider plus reduced motion are the complete model. Do
not add a second field, split playfield/interface sliders, add per-effect toggles, or bump the
settings schema. Glow intensity controls halo strength; reduced motion controls glitch/animation.
They are independent.

**0-intensity legibility.** At intensity 0 the halo alpha is 0 and nothing else changes. Every shape,
border, text, warning hatch, playhead, timeline node, banner label, run-over frame, and focus ring
remains visible. Glow is never a visibility switch or the only cue. Focus rings never consume a glow
utility and never depend on the setting.

**Settings copy and preview.** The settings and pause config use the approved copy: “Adjust the glow
on every in-run surface: the play field, enemies, warnings, timeline, boss banner, pause menu, and
run-over. Presentation pages keep fixed glows.” The help line is
`IN-RUN GLOW ONLY. PRESENTATION PAGES STAY FIXED.` The static `GlowPreview` is promoted to
`src/shared/ui/glow-preview.tsx` and keeps the half-scale arena and player while adding a decorative
red square, an orange warning lane, a representative timeline track/node, and a small boss plate. It
is static, `aria-hidden`, non-interactive, and the only settings-page surface that consumes the
slider.

**No settings schema change.** `shapebound:settings` keeps its existing shape and version. No new
storage key, no migration, and no bump are involved.

## Options considered

- **Keep ADR-014's scope: play field and preview only.** Smallest change and already accepted. Con:
  the slider stops at the edge of the run's own HUD; the timeline, banner, connector, and run-over
  stay fixed while the field changes, which reads as two inconsistent visual systems. Rejected.
- **Fixed chrome except the timeline.** Let only `glow-track` consume intensity and keep the banner,
  pause connector, and run-over fixed. Con: the timeline would be the sole in-run chrome surface that
  responds, making the boundary arbitrary; the banner and run-over are as much part of the run as the
  track. Rejected.
- **All glows app-wide, including presentation pages.** One simple rule: everything reacts. Con:
  the title, settings, `/skills`, and site header would change with an in-run preference, making
  presentation pages feel like game surfaces and weakening the stable brand frame. Rejected.
- **Separate playfield and interface glow sliders.** More control. Con: adds a settings field and a
  schema decision; the player has to manage two values to express one preference; the approved model
  is one 0–100 slider. Rejected.
- **Per-effect toggles.** Maximum control. Con: settings complexity without a measured need, a larger
  schema, and no evidence players want to tune each halo separately. Rejected.
- **All in-run surfaces, presentation pages fixed (chosen).** One rule that follows the run boundary,
  reuses the existing slider, and keeps the presentation identity stable.

## Rationale

The meaningful boundary is “in the run” versus “presentation,” not “play field” versus “chrome.” The
timeline, banner, pause connector, and run-over are all read while playing; if the player turns glow
down, those surfaces should dim with the field. The title, settings, and `/skills` pages are the
stable frame around the game and should not inherit an in-run preference. This keeps the setting
legible without adding settings complexity.

`currentColor` plus `filter: drop-shadow` is the smallest utility family that works for a 1 px line,
clipped diamonds, and a clipped panel silhouette. It preserves the existing token roles and avoids
per-color glow utilities. Keeping focus rings and all non-glow cues independent of the slider is the
accessibility invariant: the setting changes emphasis, never whether something can be seen or
operated.

## Consequences

- `docs/design-system.md` must replace the play-surface glow list with the final in-run consumer list,
  record the presentation-page exception, the three new utilities, the 0-intensity legibility rule,
  the updated settings/pause copy, and the unchanged settings schema.
- `AGENTS.md` design non-negotiables must replace the old “glow intensity is play-only” sentence with
  the in-run scope and the new consumer list. Until that edit lands, the current `AGENTS.md` wording
  is stale and conflicts with this ADR.
- `src/styles/global.css` must add `glow-track`, `glow-hud`, and `glow-danger`, and must not add
  `shadow-glow-track`. `docs/components.md` must record the promoted `GlowPreview` and the static
  preview additions. `.ai/memories/conventions.md` and `docs/runbook.md` glow troubleshooting must
  follow.
- The settings and pause config copy and preview change; the pause menu's connector, boss banner, and
  run-over panel become intensity consumers. No new settings field, no new storage key, no schema
  version bump, and no migration.
- Tests must check each in-run consumer at 0 and 100, that presentation pages stay fixed, that the
  timeline/playhead/focus ring remain visible at 0, and that focus rings do not consume the variable.
- The exact `glow-track`/`glow-hud`/`glow-danger` alphas are design-tunable proposals, not gameplay or
  balance values. Tuning them within the role and 0-intensity legibility floor is a design-note /
  `global.css` change, not a new ADR.
- ADR-014 remains the record for the semantic color roles, values, and `clip-diamond`,
  `bg-warning-lane`, `glow-enemy`, and `glow-warning`. Only its glow consumer scope and track-glow
  paragraph are superseded. Do not rewrite the rest of ADR-014.
- No new font, runtime dependency, canvas, or second art direction.
