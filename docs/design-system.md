# Design system

## Reference

The visual direction is based on the live **Cyberpunk 2077** site at
[cyberpunk.net](https://www.cyberpunk.net/), sampled on 2026-10-22. The site's stylesheet uses:

- **Acid yellow** `#fcee0a` as the dominant field and primary call to action
- **Cyan** `#00f0ff` for data labels, secondary actions, and toggles
- **Red** `#fe1038` / orange `#ff6000` for warnings, glitches, and destructive actions
- **Black** `#000000` for panels, navigation, and heavy display type
- **Greys** `#cbcbcb`, `#4c4c4c`, `#333333` for body text and rules

The reference's display faces are **Blender Pro**, **Refinery-25**, **Integral**, **Halis GR**, and
**Proxima Nova** — all proprietary/commercial fonts. This project does **not** redistribute those
files. It uses open-licensed lookalikes:

| Role    | Font               | License | Why                                                                   |
| ------- | ------------------ | ------- | --------------------------------------------------------------------- |
| Hero    | **Anton**          | OFL 1.1 | Heavy, condensed poster type; closest free match to Refinery/Integral |
| Display | **Chakra Petch**   | OFL 1.1 | Angular, squared terminals; closest free match to Blender Pro         |
| Body    | **Rajdhani**       | OFL 1.1 | Condensed industrial sans; keeps the HUD/tech tone                    |
| Mono    | **JetBrains Mono** | OFL 1.1 | Terminal labels, stats, keys, build metadata                          |

All four are bundled locally through Fontsource. No runtime request is made to Google Fonts or the
reference site. If the project later obtains a license for the original faces, they can be swapped in
`src/styles/global.css` without touching component markup.

No proprietary logos, character art, or font files from the reference are used. The hero graphic is
an original inline SVG composition. The name and marks are the project's own.

## Direction

**Yellow-dominant cyberpunk industrial.** The landing experience is a yellow field with black
structural panels, a black angular navigation bar, oversized condensed black type, cyan data labels,
and red glitch accents. Content below the hero shifts to black sections with acid borders, echoing
the reference's transition from hero to news modules.

Core motifs:

- Thick black and acid-yellow contrast, not a dark-only interface.
- Heavy, condensed, uppercase display type with tight leading.
- Asymmetric clipped corners (`clip-nav`, `clip-button`, `clip-corner`), never large rounded cards.
- Thin acid borders, black translucent panels, restrained glow.
- Cyan `/// SECTION_LABEL` markers with a dotted tail.
- Halftone dots, technical grids, scanlines, diagonal hazard stripes, and short red glitch bars.
- Photography is replaced with original abstract geometry: shards, hexagons, grids, and signal bars.

## Palette

All colors are `@theme` tokens in `src/styles/global.css`; utilities are generated from them. Never
use raw hex/rgb in components.

| Token             | Value     | Role                                            |
| ----------------- | --------- | ----------------------------------------------- |
| `void`            | `#000000` | Page background on dark screens, panel fill     |
| `panel`           | `#000000` | Panels and navigation                           |
| `panel-raised`    | `#111111` | Nested cells, slight elevation                  |
| `line`            | `#333333` | Default borders and dividers                    |
| `line-bright`     | `#4c4c4c` | Active borders, muted controls                  |
| `ink`             | `#f5f5f5` | Primary text on black                           |
| `muted`           | `#cbcbcb` | Secondary text on black                         |
| `paper`           | `#fcee0a` | Yellow field / hero background                  |
| `ink-inverse`     | `#000000` | Primary text on yellow                          |
| `muted-inverse`   | `#333333` | Secondary text on yellow                        |
| `acid`            | `#fcee0a` | Primary action, borders, identity               |
| `acid-bright`     | `#fbff31` | Rare highlight / hover                          |
| `acid-dim`        | `#f2e900` | Yellow variant used by the reference            |
| `cyan`            | `#00f0ff` | Data labels, links, secondary emphasis, toggles |
| `cyan-dim`        | `#0099a8` | Muted cyan                                      |
| `magenta` / `red` | `#fe1038` | Glitch, warnings, destructive actions           |
| `orange`          | `#ff6000` | Reserved accent; use sparingly                  |
| `danger`          | `#fe1038` | Destructive actions only                        |

Color rules:

- **Acid** is the field and primary action. Black text on acid; acid text on black.
- **Cyan** is information. Use it for labels, links, toggles, and secondary emphasis on black.
- **Red** is warning/glitch/destructive. Do not use it for ordinary body copy.
- **Orange** is reserved; do not introduce a new accent without a design note.
- On yellow, use black (`ink-inverse`) for text. On black, use `ink`/`muted`. Never low-contrast
  yellow-on-yellow or cyan-on-yellow for body text.

## Typography

| Role    | Family         | Weights | Use                                                |
| ------- | -------------- | ------- | -------------------------------------------------- |
| Hero    | Anton          | 400     | `SHAPE BOUND`, `404`, play-screen display headline |
| Display | Chakra Petch   | 600–700 | Section headings, buttons, panel titles            |
| Body    | Rajdhani       | 500–700 | Paragraphs, descriptions, labels                   |
| Mono    | JetBrains Mono | 400–500 | HUD labels, stats, keys, build metadata            |

Conventions:

- Hero display: uppercase, `leading-[0.8]`, tight tracking, black on paper. Do not use Anton for
  paragraphs or small labels.
- Section headings: Chakra Petch, uppercase, bold, tight tracking.
- HUD labels: JetBrains Mono, uppercase, `tracking-[0.18em]` to `[0.3em]`, small.
- Body: Rajdhani, normal case, comfortable leading. Do not set long copy in uppercase.
- Buttons use Chakra Petch (display), not mono, to match the reference's CTAs.
- No italic display type, script faces, or more than one accent font per screen.

## Layout and surfaces

- Page max width: `max-w-[1500px]` on the landing; `max-w-7xl` / `max-w-5xl` on internal screens.
- Gutters: `px-4` → `sm:px-6` → `lg:px-10`.
- The landing page is a yellow field. The nav, art panel, module strip, and footer are black
  structures with acid borders.
- Internal screens use black fields with a yellow top bar (`border-b-4 border-ink-inverse`) and
  black panels.
- Corners are clipped, not rounded. Use `clip-nav` for the top bar, `clip-button` for actions,
  `clip-corner` for panels.
- `SectionLabel` renders the `/// LABEL` marker with a thin rule and dot tail. Use cyan by default,
  red for error/scaffold sections, acid for storage/status modules.
- Panels: black fill, 1px border, clipped corner. Tones: default grey, acid, cyan, red.
- Buttons: `primary` acid fill/black text, `secondary` black fill/acid text, `inverse` black fill/acid
  text for yellow fields, `ghost` text-only, `danger` red. Use `inverse` on yellow, `primary` on black.

Background utilities:

| Utility            | Effect                                        |
| ------------------ | --------------------------------------------- |
| `bg-halftone`      | Black dot halftone for yellow fields          |
| `bg-grid-ink`      | Technical grid in black for yellow fields     |
| `bg-grid`          | Technical grid in light ink for black fields  |
| `bg-scanlines`     | Light scanlines for black panels              |
| `bg-scanlines-ink` | Dark scanlines for yellow fields              |
| `bg-aurora`        | Cyan/red/acid radial fields for dark screens  |
| `bg-glitch`        | Thin repeating red glitch bars                |
| `bg-dots`          | Current-color dot field (section-label tails) |
| `bg-hazard`        | Acid/black diagonal hazard tape               |

## Motion

- Standard transition: 150ms, `ease-snap`, color/border/shadow/transform only.
- Ambient: `animate-drift` (grid), `animate-pulse-line` (status dots), rare `animate-flicker`.
- Do not animate the giant hero type continuously; the glitch is a static text shadow.
- Respect both `prefers-reduced-motion` and `html[data-reduced-motion='true']`.
- Motion never carries information alone.

## Tailwind v4 conventions

- `src/styles/global.css` is the single entry: `@import 'tailwindcss'`, `@theme`, base layer, custom
  `@utility` definitions. No `tailwind.config.js`.
- Class strings must be statically discoverable. Do not construct class names dynamically.
- Use `cx()` for conditional classes; it joins, it does not merge conflicts. Use primitive variants.
- `@apply` is reserved for the base layer. No CSS Modules, CSS-in-JS, or styled-components.
- Arbitrary values are allowed for HUD sizing and clamp-based display type; prefer tokens/scale steps.
- `prettier-plugin-tailwindcss` sorts classes; let `pnpm format` handle it.
- New shared primitives live in `src/shared/ui/`; feature composition stays in the feature.

## Accessibility

- **Focus:** global `:focus-visible` uses `2px solid currentColor` with a 4px offset. On yellow,
  currentColor is black; on black, it is light ink. Component-specific cyan focus is used on the
  settings toggle.
- **Contrast:** black on acid and ink on black are strong. Do not set body copy in cyan/red on
  yellow. Do not put acid text on white/yellow without a black backing.
- **Semantics:** one `h1` per screen, `button` for actions, `Link` for navigation, labels for inputs.
- **Keyboard:** every action reachable; the settings switch is a real checkbox; skip control focuses
  `<main>` without changing the hash route.
- **Reduced motion:** system preference and in-app setting both disable drift/flicker/transitions.
- **Decorative art:** hero SVG, grids, scanlines, halftone, and the board preview are `aria-hidden`.
- **Color is not the only signal:** status chips include text (`ONLINE`, `PENDING`), not just color.

## Extension rules

- New color: needs a semantic role and a design note; a new accent needs an RFC.
- New font: needs an RFC plus a licensed, locally bundled WOFF2. No runtime CDN.
- New utility: add it with `@utility` in `global.css` and document it here.
- New animation: define `--animate-*` and `@keyframes`; add reduced-motion behavior.
- New primitive: add to `src/shared/ui`, use existing tokens, and update `docs/components.md`.
- Proprietary reference assets are never copied. If the project licenses the original fonts, record
  it in an ADR and add the license files before bundling.
