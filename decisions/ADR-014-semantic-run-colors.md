# ADR-014 — Semantic blue/purple/green/glow extension

- **Status:** Superseded by ADR-015 (glow scope only; color roles remain)
- **Date:** 2026-10-26
- **Topic:** design system / visual identity
- **RFC:** —
- **Refines:** [ADR-006](ADR-006-cyberpunk-reference-visual-system.md) (the reference-derived visual
  system stands; this extends its semantic roles)

> **Superseded in part:** [ADR-015](ADR-015-in-run-glow-scope.md) replaces only this ADR's
> `--glow-intensity` consumer scope and its “Track glow” paragraph. The semantic color roles and
> values, `clip-diamond`, `bg-warning-lane`, `glow-enemy`, and `glow-warning` remain in force.

## Context

The run slice introduces a survival currency (blue points), three boss identities (purple, green,
orange), a timeline track, enemy bodies, and a laser warning lane. The existing palette has acid as
the field and primary action, cyan as information/link/focus, red as warning/destructive, and orange
as a reserved accent with no assigned role. There is no blue, purple, or green token.

Reusing existing colors would change their meaning. Cyan is the information and focus color; using it
for points would make the currency read as a link and compete with focus rings. Red is danger; using
it for a boss identity would make a milestone read as an error. The design system's extension rules
require a semantic role and a design note for a new color, and an RFC for a new accent. The author
approved the roles, values, and utilities on 2026-10-26.

The existing `AGENTS.md` non-negotiable also limits `--glow-intensity` to `glow-player`, `glow-arena`,
`glow-joystick`, and the static settings preview. Enemy bodies and the warning lane need the same
intensity behavior, so that consumer list must change.

## Decision

**Add five semantic color tokens** to `@theme` in `src/styles/global.css`:

| Token         | Value     | Role                                                                                                                                  |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `survival`    | `#2f7bff` | Survival currency only: the blue point icon, balance accent, run-over/pause readouts. Not links, secondary buttons, focus, or status. |
| `boss-purple` | `#b45cff` | Boss identity only: boss timeline nodes, boss banner edge/diamond, boss currency legends, future boss-currency UI.                    |
| `boss-green`  | `#3ddc84` | Boss identity only, same role as `boss-purple`.                                                                                       |
| `boss-orange` | `#ff6000` | Semantic alias of the existing `orange`; the third boss identity. Keep `orange` for the triangle body/warning.                        |
| `track`       | `#c7d0d6` | Structural neutral for the 1 px timeline line only. Not text, buttons, or borders.                                                    |

The start node uses existing `ink` (`#f5f5f5`); no `node-start` token is added. The designer's
`run-tokens.md` remains the source for the current values and the utility formulas; this table records
the roles and the accepted starting values.

**Add four approved utilities.**

- `clip-diamond` — a filled diamond without a border, for the point icon, timeline nodes, legend
  diamonds, and the boss banner diamond. An outlined diamond uses a rotated square with a real border
  instead, because a clipped border disappears at the point.
- `bg-warning-lane` — a diagonal hatch texture built from the existing orange token. It is a
  non-color signal for the warning lane, not a new hue.
- `glow-enemy` — a `currentColor` box-shadow scaled by `--glow-intensity` and `--glow-scale`. The red
  square and orange triangle bodies set both `bg-*` and `text-*` to the same hue so the shadow
  matches.
- `glow-warning` — the same formula at a lower alpha, for the warning lane and the beam.

**Glow consumer rule.** `--glow-intensity` may be consumed only by:

- `glow-player`, `glow-arena`, `glow-joystick` (existing);
- `glow-enemy` on the red square and orange triangle bodies;
- `glow-warning` on the warning lane and beam;
- the static `GlowPreview` in settings and in the pause config.

Interface chrome — the HUD, pause menu, run-over, `/skills`, buttons, panels, the timeline track, and
the boss banner — stays on fixed `shadow-glow-*` treatments and never reads `--glow-intensity`. The
pause menu and run-over are chrome, not play-field surfaces.

**Track glow.** `shadow-glow-track` is not approved. The timeline track is a plain 1 px `track` line
with no shadow until the author approves a fixed chrome glow. Do not substitute `shadow-glow-cyan`.

**Values are design proposals, not playtested constants.** The roles and token names are accepted.
The hex values are the author-approved starting values, but they remain design proposals until
playtested; they are not balance values and have not been tuned in play. Tuning a value within its
role and contrast floor is a design-note / `global.css` change, not a new ADR. The durable parts are
the semantic roles, the `currentColor` glow formula, and the consumer list. The gameplay values
quoted alongside the visual brief — lane width, charge duration, enemy sizes, pool counts, and cadence
— are `[unverified]` balance owned by `game-designer` and are not covered by this ADR.

**Why an ADR rather than only a design note.** The extension changes a cross-cutting `AGENTS.md`
non-negotiable (the `--glow-intensity` consumer list) and introduces semantic roles consumed by the
HUD, play field, run-over, pause config, and `/skills`. That is more than a reversible one-screen
color choice. The exact hex values remain design-note-tunable; no fifth ADR is created for them.

## Options considered

- **Reuse cyan for survival points.** No new token. Con: cyan is information/link/focus; points would
  read as a link and compete with focus rings; the currency would lose a distinct role. Rejected.
- **Reuse red for a boss identity.** No new token. Con: red is danger/destructive; a boss milestone
  would read as an error; the meaning would collide. Rejected.
- **Add five brand-new colors, including a new orange.** Maximum separation. Con: unnecessary;
  orange already exists and only needed a role; `track` is a neutral, not an accent. Rejected.
- **Use only existing tokens and no new accent.** Smallest palette. Con: three boss identities and a
  survival currency cannot be distinguished without color, and color alone is not allowed; the UI
  would need invented shapes and labels for every state. Rejected.
- **One glow utility per color.** Explicit shadows. Con: three near-duplicate red/orange utilities;
  `currentColor` handles the hue with one utility. Rejected.
- **Use fixed `shadow-glow-*` for enemies and warnings.** No new glow utilities. Con: ignores the
  glow-intensity preference on the play field, which is exactly where the setting is supposed to act.
  Rejected.
- **Semantic tokens plus two `currentColor` play glows (chosen).** Small, role-based, and consistent
  with the existing play-glow pattern.

## Rationale

The existing identity is acid/cyan/red. The run slice needs a currency color that is not cyan, three
boss identities that are not red, and a structural neutral for the timeline. A small set of semantic
roles is clearer than borrowing existing accents and changing their meaning. `currentColor` keeps the
enemy and warning glows to two utilities and lets the same formula respect the user's intensity.
Restricting the variable to play-field surfaces and static previews preserves the existing rule that
interface chrome does not react to the setting. Orange is promoted rather than invented because the
hue already exists and the triangle already uses it; the boss and threat contexts are separated by
shape, legend text, and position.

## Consequences

- `docs/design-system.md` must add the palette rows and color rules (blue = currency, purple/green/
  orange = boss identity, track = structure, orange promotion), update the play-surface glow list and
  the “only these consume `--glow-intensity`” rule, the settings copy, and the accessibility/contrast
  notes.
- `AGENTS.md` design non-negotiables must list the new glow consumers and semantic colors.
- `src/styles/global.css` must define the tokens and utilities. Components use
  `bg-*`/`text-*`/`border-*`/custom utilities and never raw hex.
- `docs/components.md` must record the promoted `GlowPreview` when the pause menu becomes its second
  consumer.
- `.ai/memories/conventions.md` and `docs/runbook.md` (glow troubleshooting) must follow.
- Contrast: `survival` passes AA on `void` (5.40:1) and `panel-raised` (4.85:1), but has little
  headroom on raised panels; use `ink` for small blue-adjacent text there. Boss colors pass the
  non-text 3:1 threshold; the legend words and accessible names always carry the color name.
- Color is never the only signal: point labels say “blue”, boss nodes and the legend name the color,
  the warning lane is hatched and edged, and locked nodes say `LOCKED`.
- At glow intensity 0, fills, borders, and the warning hatch remain visible; only the box-shadow alpha
  goes to 0.
- No new font, runtime dependency, canvas, or second art direction.
- If a future slice needs another accent, follow the design-system extension rule; do not add a sixth
  color ad hoc.
