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
| `orange`          | `#ff6000` | Triangle threat body and warning lane           |
| `danger`          | `#fe1038` | Destructive actions only                        |
| `survival`        | `#2f7bff` | Blue-point survival currency only               |
| `boss-purple`     | `#b45cff` | Boss identity only                              |
| `boss-green`      | `#3ddc84` | Boss identity only                              |
| `boss-orange`     | `#ff6000` | Third boss identity; alias of `orange`          |
| `track`           | `#c7d0d6` | Structural neutral for the timeline line only   |

Color rules:

- **Acid** is the field and primary action. Black text on acid; acid text on black.
- **Cyan** is information. Use it for labels, links, toggles, focus rings, and secondary emphasis on
  black. Do not use it for the survival currency.
- **Red** is warning/glitch/destructive. Do not use it for ordinary body copy.
- **Orange** is the triangle threat and its warning lane. **`boss-orange`** is the third boss
  identity; the two contexts stay separate by shape, label, and position.
- **`survival`** is blue-point currency only: the point diamond, balance accent, and run-over/pause
  readouts. It is not a link, secondary button, focus color, or status.
- **`boss-purple`**, **`boss-green`**, and **`boss-orange`** are boss identity only: timeline nodes,
  the boss banner edge/diamond, currency legends, and future boss-currency UI.
- **`track`** is the structural neutral for the 1 px timeline line only. It is not text, buttons, or
  a general border.
- On yellow, use black (`ink-inverse`) for text. On black, use `ink`/`muted`. Never low-contrast
  yellow-on-yellow or cyan-on-yellow for body text.
- Color is never the only signal. Point labels say “blue”; boss nodes and the legend name the color;
  the warning lane is hatched and edged; locked nodes say `LOCKED`.

## Typography

| Role    | Family         | Weights | Use                                     |
| ------- | -------------- | ------- | --------------------------------------- |
| Hero    | Anton          | 400     | `SHAPE BOUND`, `404`, run-over headline |
| Display | Chakra Petch   | 600–700 | Section headings, buttons, panel titles |
| Body    | Rajdhani       | 500–700 | Paragraphs, descriptions, labels        |
| Mono    | JetBrains Mono | 400–500 | HUD labels, stats, keys, build metadata |

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
- Presentation pages (`/`, `/settings`, `/skills`, and future non-game screens) use the shared
  `SiteHeader`, rendered once by `PresentationLayout` so it persists across route changes; the active
  nav item is acid. `/settings` and `/skills` use the dark route field; the title keeps the yellow
  field. `/play` is deliberately headerless, full-bleed, and outside the layout.
- Corners are clipped, not rounded. Use `clip-nav` for the header, `clip-button` for actions,
  `clip-corner` for panels.
- **Clipped borders use `clip-border`, never `border-*`.** A CSS border is clipped at the diagonal
  and disappears at the cut. `clip-border` uses the inner-layer technique: the element’s background
  is the border color, and an absolutely positioned `::before` layer inset by
  `--clip-border-width` (1px, 2px on focus) paints the fill with `clip-path: inherit`. Set
  `--clip-border` and `--clip-fill`; `isolation: isolate` and a negative z-index keep the fill below
  the content and above the border. Do not add `bg-*` to a `clip-border` element: the outer
  background is the border. This is the canonical border treatment for buttons, panels, the site
  header, the title art panel, and the skip link.
- `SectionLabel` renders the `/// LABEL` marker with a thin rule and dot tail. Use cyan by default,
  red for error/warning sections, acid for storage/status modules.
- Panels: black fill, 1px `clip-border` in the tone color, clipped corner. Tones: default grey, acid,
  cyan, red.
- Buttons: `primary` acid fill/black text, `secondary` black fill/acid text, `inverse` black fill/acid
  text for yellow fields, `ghost` text-only, `danger` red fill/black text. Use `inverse` on yellow,
  `primary` on black. All variants have hover, active (`translate-y-0.5`), and
  `focus-visible` states. Focus uses a 2px cyan `clip-border` ring; ghost uses a focus background.
  Do not add `border-*` to a clipped button.

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

Run-specific utilities: `clip-diamond` clips a filled diamond for the point icon, timeline nodes,
legend diamonds, and the boss banner diamond. `bg-warning-lane` is the orange diagonal hatch for the
triangle warning lane; it is a non-color signal. `glow-enemy`, `glow-warning`, `glow-track`,
`glow-hud`, and `glow-danger` are the in-run intensity utilities described under Play surface.
`glow-track` is also used by the thin shield line, instant reflected beams, and preview lanes.
`glow-enemy` colors the shape-matched explosion outline. `shadow-glow-track` is rejected and unused.

### Play surface

The play screen is a deliberate exception to the presentation pages' shared `SiteHeader`. It is
full-bleed black with no header and no reserved HUD band. The run HUD overlays the top edge; the
arena stays centered and is never scaled or moved to make room.

- **Background:** `bg-void` plus a faint `bg-grid` (`opacity-60`). The global scanline overlay is
  hidden on `/play`; do not add aurora, glitch, or hazard tape to the board.
- **Player container:** a static, outline-only square centered in the safe playfield
  (`border-2 border-cyan/60 glow-arena`, no fill). It is the player's collision boundary and a key
  game feature; the player sits inside it. Starting size is 320 px `[unverified]` and is intended to
  grow through skill-tree upgrades.
- **Player:** an acid square (`bg-acid glow-player`) sized from player stats. Position is written as
  a transform; do not animate its layout properties. A player-local charge ring (inset 4 px, 2 px
  stroke, black-on-acid track/progress and centered digit) and up to three 5 × 2 px barrier notches
  on the top edge are visual-only. Both are `aria-hidden`, have no independent glow, and are written
  from discrete values; the ring arc is the only recharge feedback. A 120 ms `outline-2 outline-ink`
  cue marks a barrier-absorbed hit and is omitted under reduced motion.
- **Shield line, beams, previews, and explosions:** a viewport-space combat layer at `z-[25]`, above
  the `z-20` joysticks and below the `z-30` HUD. The shield is one 64 × 2 px `bg-cyan text-cyan
glow-track` bar; the midpoint sits `playerSize / 2 + 14` px from the player center and the bar is
  tangent to that orbit. Position and rotation are written imperatively and never tweened. The shield
  is hidden unless active. Up to six instant reflected beams are 12 px cyan `glow-track` lanes that
  start at the **shield midpoint**, pass through every allowed target, and last 180 ms. They stop
  after the last allowed target when the pierce budget is exhausted, or continue to the viewport edge
  when pierce remains spare. Up to six preview lanes are dim 12 px cyan paths for charging warnings
  that would reflect. Beam and preview nodes use a top-left transform origin so the shield midpoint is
  the line's start, not its center. Explosions are hollow SVG outlines: a square for red squares, or
  the triangle silhouette rotated to its aim for orange triangles. They start at the enemy size,
  expand to 48 px, and fade over 450 ms in `text-red` or `text-orange` with `glow-enemy`. Beams,
  previews, and explosions are clipped only by the viewport; explosions are suppressed under reduced
  motion. The layer is allocated at mount, never grows, and is written at most once per frame.
- **Joystick:** movement uses a cyan solid-ring base and round knob (`border-cyan/50`, `bg-cyan/10`,
  `bg-cyan`, `glow-joystick`). The touch shield uses the non-color variant: dashed `border-cyan/50`
  base with `bg-cyan/5` and a rotated-square diamond knob (`size-9`, 6 px cyan center,
  `glow-joystick`). Circular shapes are a functional exception to the clipped-surface rule; do not use
  the circle treatment for ordinary panels or buttons.
- **Enemy layer:** one `aria-hidden`, `pointer-events-none` overlay of 36 body nodes, 6 warning nodes,
  and 6 beam nodes. The red square is `bg-red text-red glow-enemy`; the orange triangle is
  `bg-orange text-orange glow-enemy` with a clipped triangular silhouette. The warning lane is
  hatched with `bg-warning-lane`, edged in orange, and carries `glow-warning`; the beam reuses the
  same rectangle with a brighter fill. Enemy nodes are positioned by transform and changed by
  opacity, never mounted per enemy.
- **Run HUD:** an absolute top overlay with `pointer-events-none`, a restrained top scrim, and no
  reserved band. Timer and points sit top-left, the genuinely centered 320 px timeline and legend
  top-center, and a 44 px pause control top-right. The pause button is the HUD's only tab stop. The
  timer is `role="timer"` with `aria-live="off"`; points are a labelled group. The timer, points,
  legend, scrim, menu button, and playhead/current ring use fixed or no glows.
- **Timeline:** the line is 1 px `track` with `glow-track`. The start node is an `ink` diamond; boss
  nodes repeat `boss-purple` → `boss-green` → `boss-orange` every five minutes. Past nodes are
  dimmed and have no halo; future/current nodes carry `glow-track` in their own `currentColor`. The
  playhead and current ring stay crisp cyan with no halo. The visible track strip is `aria-hidden`
  while the legend stays visible; a visually hidden list carries the accessible labels and states.
- **Boss banner:** a 320 px clipped plate centered above the arena, `pointer-events-none`,
  `role="status"`, announced once. It is 64 px tall when the viewport is at least 480 px tall and a
  compact single-row 44 px on short landscape. The fill is translucent (`bg-void/85`, no blur) so a
  player at the top edge stays partly visible; the boss edge, ink rule, labels, and diamond stay
  opaque. The wrapper carries `glow-hud` with the boss `currentColor`. Copy says `BOSS MARKER`; the
  banner never freezes the run, spawns a boss, awards currency, or despawns enemies. The timeline
  dims while it is visible. The decorative glitch strip is hidden under reduced motion.
- **Pause menu:** a native modal `<dialog>` over the frozen board and HUD. It opens as a left rail
  (Resume, Config, Restart, Back to title, locked Skill Tree); selecting a content item reveals the
  right panel and a 2 px cyan connector. The connector carries `glow-hud`; the dialog frame, rail,
  and buttons keep fixed or no glows. Config reuses the settings switch, range, and static preview.
  The current frame expands from the center when a panel opens; it is not rail-anchored, and the
  current build has no frame entrance/collapse animation. The board stays frozen for the menu's
  lifetime.
- **Run-over:** a modal `fixed inset-0 bg-void/90` with a red clipped panel inside a non-scrolling
  wrapper carrying `glow-danger text-red`, so the drop-shadow follows the silhouette. The frozen
  board, HUD, and enemies stay visible underneath but are dimmed and inert. The panel shows final
  time, final blue points, and the commit state; `failed` adds `Retry save`, `unreadable` adds a
  `/settings` route, and `unavailable` explains the blocked storage without a settings repair.
- **Glow intensity:** `glow-arena`, `glow-player`, `glow-joystick`, `glow-enemy` (bodies and
  explosions), `glow-warning` (lane and beam), `glow-track` (timeline line, future/current nodes,
  shield line, reflected beams, and preview lanes), `glow-hud` (banner and pause connector), and
  `glow-danger` (run-over) consume `--glow-intensity` (0–100, default 100) and `--glow-scale` (1; the
  settings preview uses 0.5). The charge ring and barrier notches deliberately have no independent
  glow: they sit inside the already-glowing player, and a halo would reduce their legibility.
  Presentation pages — title, settings chrome, `/skills`, and the site header — keep fixed
  `shadow-glow-*` glows. At intensity 0 every shape, border, text, warning hatch, playhead, timeline
  node, banner label, run-over frame, charge digit, notch, shield line, beam, preview, explosion
  stroke, and focus ring remains visible; only halo alpha reaches 0. Focus rings never consume a glow
  utility.
- **Overlays:** the portrait gate is a blocking `role="status"` overlay over the mounted board; it
  uses black/ink/cyan and does not reveal the run underneath. The touch start overlay uses the
  `Button` primitive; the acid button needs a cyan focus outline so the focus ring remains visible on
  black.
- **Safe areas:** the board background is full-bleed; the playfield is inset with
  `env(safe-area-inset-*)` so the container is centered in the safe area. The app shell also insets
  in-flow screens from the side cutouts; the play surface is the full-bleed exception.

### Skills page

`/skills` is a presentation page: dark `bg-void` field, static `bg-aurora`, faint `bg-grid`, and the
shared header. It uses fixed glows only and never reads `--glow-intensity`. The saved blue balance
is the largest value, marked with a `survival` diamond and accompanied by the words `BLUE POINTS` and
`SAVED BALANCE`. Best time and run count are smaller read-only values. The tree has four branches in
the order Barrier, Movement, Size, Reflect. Seven known nodes are plain bordered buttons with a
`2/5`-style level, an exact current effect, a `+1 PT` cost, and a text level meter; five static
`FUTURE NODE` placeholders stay non-interactive. `Reset Skills` is a separate footer action with an
`aria-disabled` zero-level state and a native confirmation dialog. Boss currency rows are reserved
and zero. The unreadable/unavailable states replace the balance row with one red panel, render a
static `READ BLOCKED` tree, and never show a fabricated balance. There is no count-up, reveal, or
marquee, and the page is identical under reduced motion.

### Settings controls

- **Reduce motion:** a real checkbox with a custom track and thumb. Both directions use a 150ms
  translate/background transition (`transition-[translate,background-color]`, with explicit
  `translate-x-0` and `translate-x-7` endpoints). The `.motion-switch` class keeps that thumb
  feedback at 150ms even when reduced motion is on; it is the only motion exception because the thumb
  position is the control's state feedback. The track fill and border also transition.
- **Glow intensity:** a real `input[type=range]` from 0 to 100 in steps of 5, styled by `range-glow`
  with a cyan progress fill, square cyan thumb, black thumb border, and cyan focus ring. It has a
  real label and a visible percentage; the visible percentage is `aria-hidden` because the native
  range announces the value.
- **Static preview:** `GlowPreview` in `src/shared/ui/glow-preview.tsx` mirrors the run at half scale
  (160 px container, 32 px player, 1 px border, `--glow-scale: 0.5`). It adds a decorative red square,
  an orange warning lane, a representative timeline track/node, and a small boss plate. It is
  `aria-hidden`, non-interactive, and has no motion. It is the only static preview affected by glow
  intensity; the same preview appears on `/settings` and in the pause config.

## Motion

- Standard transition: 150ms, `ease-snap`, color/border/shadow/transform/translate only.
- Ambient: `animate-drift` (grid), `animate-pulse-line` (status dots), rare `animate-flicker`.
- The hero `SHAPE` word and the 404 heading use `animate-glitch`: a 6-second discrete loop with
  brief cyan/red split-and-translate bursts. The 404 heading also uses `animate-glitch-flip`, a
  9-second cycle of irregular, split-second `scaleX(-1)` snaps; the flip is on the heading and the
  glitch is on an inner layer so the transforms compose. `BOUND` and other display type stay
  static; do not animate other giant type continuously.
- Respect both `prefers-reduced-motion` and `html[data-reduced-motion='true']`. The reduce-motion
  switch thumb keeps its 150ms transition in both directions as state feedback; all other
  transitions and animations are disabled.
- Motion never carries information alone.
- On `/play`, player, joystick, enemies, instant reflected beams, preview lanes, the live
  timer/timeline, the shield line, the charge ring, and barrier notches are essential gameplay or
  clock feedback, not decoration; reduced motion must not remove them. The timeline's positional
  drift is the visual equivalent of the clock and is an approved exception. The boss banner's
  decorative glitch strip, the 120 ms barrier-hit outline, and explosions are omitted under reduced
  motion; the warning lane keeps its hatch and edge. The board has no ambient
  animation.
- The pause frame's width/transform transition and panel reveal are disabled under reduced motion;
  the reduce-motion switch thumb keeps its 150ms feedback as documented above.

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
  settings toggle and the glow-intensity range. Clipped buttons suppress the clipped outline and use
  a 2px cyan `clip-border` focus ring instead; ghost buttons use a focus background.
- **Contrast:** black on acid and ink on black are strong. Do not set body copy in cyan/red on
  yellow. Do not put acid text on white/yellow without a black backing.
- **Semantics:** one `h1` per screen, `button` for actions, `Link` for navigation, labels for inputs.
- **Keyboard:** every action reachable; the settings switch is a real checkbox and the glow control
  is a real range input; skip control focuses `<main>` without changing the route.
- **Play surface:** the board is a region with a visually hidden `h1` and movement/shield
  instructions. The rotate overlay is a `role="status"` live region. The player, container outline,
  joysticks, shield line, reflected beams, preview lanes, explosions, charge ring, barrier notches,
  and enemy layer are `aria-hidden` visual representations; the domain state is the source of truth.
  The instructions state keyboard movement, right-mouse shield, the lack of a keyboard parry,
  first/second touch roles, beam reflection and instant beams, the charge ring, barrier notches, and
  the arena boundary, with level-0/no-barrier conditional sentences. The
  settings glow preview is also `aria-hidden`; it adds no controls and carries no information that is
  not in the range value.
- **Run HUD:** the timer is `role="timer"` with `aria-live="off"`; points are a labelled group, not a
  live region. The visible track strip is `aria-hidden` while the legend stays visible; a visually
  hidden list mirrors only the visible node set and updates only when membership or past/current/
  future state changes. The boss banner is a `role="status"` that announces once. The pause button is
  the HUD's only tab stop.
- **Dialogs:** the pause menu and run-over are native modal dialogs with focus entry, a focus trap,
  and focus return. The pause menu's Skill Tree item is focusable and `aria-disabled` during a run.
  The run-over keeps its final points visible in every commit state and never presents a projected
  total as banked.
- **Skills:** `/skills` has one `h1`; seven known nodes are native add buttons and five placeholder
  nodes are static `LOCKED` rows; Reset Skills is a native button with an in-app confirmation dialog,
  explicit focus return, and disabled/`aria-disabled` empty state; reserved currency rows name the
  color; the page does not read `--glow-intensity`.
- **No keyboard parry.** The shield is engaged with the right mouse button or a second touch only.
  There is no key binding and no focusable shield control. This is the author-approved accessibility
  exception; movement, pause, and all menus remain keyboard operable. The `#play-instructions` text
  states it explicitly.
- **Play start:** the touch start overlay uses a real `button` and adds the line
  `ONE FINGER MOVES // A SECOND FINGER AIMS THE SHIELD WHEN CHARGES ARE AVAILABLE.` On the acid
  button, use a cyan focus outline so the ring remains visible against black.
- **Reduced motion:** system preference and in-app setting both disable drift/flicker/glitch/
  transitions, except the reduce-motion switch thumb feedback documented under Motion. The shield
  line, charge ring, notches, player movement, reflected beams, and previews remain essential; the
  120 ms hit cue and explosions are omitted.
- **Decorative art:** hero SVG, grids, scanlines, halftone, and the play-surface decoration are
  `aria-hidden`.
- **Color is not the only signal:** status chips include text (`ONLINE`, `PENDING`), not just color.

## Extension rules

- New color: needs a semantic role and a design note; a new accent needs an RFC.
- New in-run surface: classify it as in-run or presentation before styling. In-run surfaces may
  consume `--glow-intensity` through the approved utilities; presentation pages and focus rings may
  not. See [ADR-015](../decisions/ADR-015-in-run-glow-scope.md).
- New font: needs an RFC plus a licensed, locally bundled WOFF2. No runtime CDN.
- New utility: add it with `@utility` in `global.css` and document it here.
- New animation: define `--animate-*` and `@keyframes`; add reduced-motion behavior.
- New primitive: add to `src/shared/ui`, use existing tokens, and update `docs/components.md`.
- Proprietary reference assets are never copied. If the project licenses the original fonts, record
  it in an ADR and add the license files before bundling.
