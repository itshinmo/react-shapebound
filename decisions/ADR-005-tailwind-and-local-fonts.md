# ADR-005 — Tailwind CSS 4, local fonts, cyberpunk-inspired design

- **Status:** Accepted
- **Date:** 2026-10-21
- **Topic:** styling / design system
- **RFC:** —
- **Amended by:** [ADR-006](ADR-006-cyberpunk-reference-visual-system.md) — reference palette and type system

## Context

The author chose Tailwind for styling and asked for an edgy, Cyberpunk 2077-inspired interface. The
game is DOM-only and offline, so fonts cannot be fetched from a CDN at runtime. Styling must remain
consistent as the game grows, and the visual layer must not invent gameplay.

The official Cyberpunk 2077 site was unreachable from the setup environment (connection timeouts).
The palette and type choice are therefore a reference interpretation of the established visual
language, centralized for later tuning. No proprietary logos, artwork, or font files are used.

## Decision

- Use **Tailwind CSS 4** through `@tailwindcss/vite`. The single entry is `src/styles/global.css`,
  containing `@import 'tailwindcss'`, the `@theme` tokens, a base layer, and custom `@utility`
  definitions. There is no `tailwind.config.js`.
- Use semantic theme tokens (`void`, `panel`, `ink`, `muted`, `acid`, `cyan`, `magenta`, `danger`)
  instead of raw palette values in components.
- Use **Chakra Petch** for display, **Rajdhani** for body, and **JetBrains Mono** for HUD labels/data.
  Bundle them with Fontsource packages imported in `src/main.tsx`; no runtime font requests.
- Use a cyberpunk-industrial language: near-black surfaces, acid-yellow primary, cyan data, magenta
  warning, clipped corners, thin rules, restrained glow, scanlines, uppercase mono labels.
- Use `cx()` for conditional classes; keep class strings static so Tailwind can scan them. Prettier
  sorts classes with `prettier-plugin-tailwindcss`.
- No CSS Modules, CSS-in-JS, or a parallel global stylesheet. `@apply` is only for base styles.

Reference palette: `#050508` void, `#0b0d12` panel, `#f3f1e8` ink, `#8a93a3` muted, `#fcee0a` acid,
`#00f0ff` cyan, `#ff2a6d` magenta, `#ff3b30` danger.

## Options considered

- **CSS Modules + tokens** — scoped, explicit, zero runtime. Con: author chose Tailwind; more
  files/boilerplate for a utility-heavy UI.
- **Vanilla global CSS** — simplest. Con: collisions and visual drift as the game grows.
- **Tailwind (chosen)** — fast composition, a theme-driven token layer, and a mature Vite integration.
  Con: class noise and a scanning discipline.
- **Google Fonts CDN** — easiest. Con: violates offline/no-network and leaks a request.
- **System fonts** — zero bundle cost. Con: loses the specific industrial/techno character.
- **Proprietary game fonts** — closest reference. Con: licensing and redistribution risk; rejected.

## Rationale

Tailwind keeps layout and state styling close to the JSX, while `@theme` centralizes the visual
identity so a palette change is one edit. The three fonts provide a clear hierarchy: angular display,
condensed readable body, terminal-like data. Fontsource gives licensed, versioned, bundled assets and
works offline. The palette follows the reference's acid/cyan/magenta-on-black language without
copying assets.

## Consequences

- Components must use static class names; dynamic class construction will silently drop styles.
- `cx()` does not merge conflicting utilities; use primitive variants instead of arbitrary overrides.
- Fontsource CSS ships WOFF2 and WOFF fallbacks for each weight. The bundle currently includes a few
  hundred KB of fonts; subset/prune weights if the payload becomes a concern.
- The palette is an interpretation and may need tuning against the reference. Change tokens in
  `global.css`, not component values.
- A new accent color or typeface needs an RFC; a new semantic token needs a design note.
- The app remains a DOM-only, offline experience; Tailwind does not change the rendering model.
