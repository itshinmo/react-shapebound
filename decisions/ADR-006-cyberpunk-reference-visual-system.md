# ADR-006 — Align the visual system with the live Cyberpunk 2077 reference

- **Status:** Accepted
- **Date:** 2026-10-22
- **Topic:** design system / visual identity
- **RFC:** —
- **Refines:** [ADR-005](ADR-005-tailwind-and-local-fonts.md) (the Tailwind decision stands)

## Context

ADR-005 established Tailwind, bundled fonts, and a cyberpunk-inspired dark interface. The reference
site was unreachable during the initial setup, so the palette and type were an interpretation rather
than a sample. The author then asked for the project to follow the live reference more closely.

On 2026-10-22 the reference site was reachable. Its stylesheet was inspected directly:

- Dominant field and CTA: `#fcee0a` (acid yellow)
- Data/secondary: `#00f0ff` (cyan)
- Warning/glitch: `#fe1038` (red) and `#ff6000` (orange)
- Structure: `#000000` panels/navigation, `#333333` / `#4c4c4c` rules, `#cbcbcb` body text
- Display faces: Blender Pro, Refinery-25, Integral, Halis GR, Proxima Nova

The existing dark-only layout was therefore the wrong composition, even though its colors were in
the right family. The reference's visual signature is a **yellow field with black structural panels
and heavy condensed black type**, not a black field with yellow accents.

The reference's fonts are proprietary/commercial. Redistributing the WOFF2 files from the site would
be a licensing problem.

## Decision

Adopt the reference's **composition and exact palette**, while using open-licensed lookalike fonts
and original artwork:

- Yellow-dominant landing hero (`bg-paper`), black nav/art/diagnostics/module/footer structures,
  acid borders, cyan section labels, red glitch accents.
- Exact palette tokens: `paper`/`acid` `#fcee0a`, `acid-bright` `#fbff31`, `acid-dim` `#f2e900`,
  `cyan` `#00f0ff`, `red`/`magenta` `#fe1038`, `orange` `#ff6000`, black, `ink` `#f5f5f5`,
  `muted` `#cbcbcb`, `line` `#333333`, `line-bright` `#4c4c4c`.
- Fonts: **Anton** for the hero/404/play display, **Chakra Petch** for UI headings/buttons,
  **Rajdhani** for body, **JetBrains Mono** for HUD labels. All OFL and bundled locally.
- Original inline SVG hero art; no copied character art, logos, or font files.
- New motifs: `clip-nav`, `clip-button`, cyan `SectionLabel` with a dotted tail, halftone/grid/glitch
  utilities, yellow top bars on internal screens.
- Update `docs/design-system.md`, `docs/components.md`, and the human onboarding notes.

## Options considered

- **Keep the dark placeholder** — already implemented and consistent. Con: does not match the
  reference's dominant yellow/black composition.
- **Use the reference's proprietary fonts** — closest pixel match. Con: licensing/redistribution
  risk; rejected.
- **Use only the existing fonts and recolor** — small change. Con: retains the wrong type
  personality; the heavy condensed hero is a major part of the reference.
- **Hybrid: exact palette/composition + OFL lookalikes + original art (chosen)** — captures the
  visual language without copying protected assets.

## Rationale

The reference's identity is carried by the yellow/black contrast, oversized condensed type, angular
cuts, and cyan/red data accents. Those are layout and token decisions we can reproduce. The exact
font files are not necessary to convey the language, and the site's artwork is copyrighted. Open
fonts with similar proportions plus original geometry give the project a coherent identity that can
ship.

## Consequences

- The landing screen is now yellow-dominant; internal screens use a yellow top bar over black.
- The interface is closer to the reference, but deliberately not a pixel clone: original art, copy,
  and marks.
- The font bundle grows by Anton. Keep an eye on payload if more weights are added.
- If the original fonts are licensed later, swap the `@font-face` sources and the `--font-*` tokens;
  component markup does not change.
- The palette is centralized in `src/styles/global.css`; tuning against new reference screenshots is
  a one-file change plus this ADR/design-doc update if the decision changes.
- Proprietary assets remain prohibited by `AGENTS.md` and `docs/decisions-not-to-fix.md`.
