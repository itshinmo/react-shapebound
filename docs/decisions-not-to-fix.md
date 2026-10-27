# Decisions not to “fix”

These look like obvious improvements. They are deliberate. Changing one requires a new ADR and a
doc update.

## 1. Clean URLs require a static-host fallback

**Why:** the author requires clean paths (`/play`, not `/#/play`). The app uses `BrowserRouter`; Vite
dev and preview provide history fallback, but a static host must serve `index.html` for unknown
paths. Subpath hosting also needs matching Vite `base` and router `basename`. GitHub Pages cannot
return a 200 for a deep link, so the deploy workflow copies `index.html` to `404.html`; the app boots
but the first response is HTTP 404. See [ADR-010](../decisions/ADR-010-clean-browser-urls.md) and
[ADR-016](../decisions/ADR-016-github-pages-deployment.md).

**Do not** switch back to `HashRouter` without an ADR. Hash routing ignores the pathname, so
arbitrary paths such as `/ax#/skills` render app routes; that was rejected after review.

## 2. No canvas, even for effects

**Why:** DOM-only keeps accessibility, text selection, DOM testing, and CSS layout available. It is a
product/architecture decision, not an implementation gap. See `decisions/ADR-002-dom-only-rendering.md`.

**Do not** add `<canvas>`, WebGL, PixiJS, Phaser, or a “small canvas just for particles”. If a
mechanic cannot be expressed in the DOM, write an RFC.

## 3. The game domain has no React imports

**Why:** pure rules are testable without a browser and deterministic under a seed. React, storage,
timers, and clocks are app/feature concerns. See `decisions/ADR-003-pure-game-domain.md`.

**Do not** import React, use `window`, `localStorage`, `setTimeout`, `Date.now`, or `Math.random` in
`src/game`. ESLint enforces this.

## 4. No state-management library yet

**Why:** the app currently has one small settings context, a feature-owned run loop, and a pure game
domain. A library would add surface without a measured need. Use a reducer/context until performance
or devtools demand otherwise. See `decisions/ADR-003-pure-game-domain.md`.

**Do not** add Zustand/Redux/XState/Jotai “to be ready”. Revisit with an ADR when there is a concrete
problem.

## 5. Tailwind is the styling system

**Why:** the author chose Tailwind. The theme is centralized in `src/styles/global.css` with semantic
tokens; primitives encapsulate variants. See `decisions/ADR-005-tailwind-and-local-fonts.md`.

**Do not** introduce CSS Modules, styled-components, Emotion, or a parallel global stylesheet. If a
pattern repeats, extract a primitive.

## 6. Fonts are bundled locally

**Why:** the game is offline. Fontsource packages emit licensed WOFF2 assets into the build; no
runtime request to Google Fonts. See `decisions/ADR-005-tailwind-and-local-fonts.md`.

**Do not** replace them with a CDN `<link>` or `@import url(...)` “because it is easier”.

## 7. No PWA/service worker yet

**Why:** there is no install/update UX and no cache-version strategy. A service worker adds
stale-cache failure modes. Offline currently means “no network after load”. See
`decisions/ADR-001-vite-react-spa.md`.

**Do not** add `vite-plugin-pwa` or a hand-written service worker without an ADR and a cache-version
strategy.

## 8. The play screen is a run slice, not a full game

**Why:** the delivered loop is movement on a landscape-only board plus a survival run: an active-time
clock, blue points at one per active second, enemy threats, a HUD and timeline, five-minute boss
markers, pause, death, a one-time progression commit, and a run-over. `/skills` is a read-only,
locked preview. Boss entities and fights, boss currency awards, node spending/upgrades, player
attack, a win condition, and active-run persistence are not implemented. Presenting them as if they
exist would misrepresent the product. See `docs/game-design.md`,
[ADR-011](../decisions/ADR-011-progression-save-v1.md),
[ADR-012](../decisions/ADR-012-viewport-enemy-simulation.md), and
[ADR-013](../decisions/ADR-013-portrait-pause.md).

**Do not** add temporary boss combat, currency awards, unlock effects, or a fake win condition to
“fill out” the run. Design the next mechanic with `design-a-mechanic` first.

## 9. The landing page is yellow-dominant

**Why:** the live Cyberpunk 2077 reference uses an acid-yellow hero with black structural panels and
heavy condensed type. The contrast is the identity, not a dark-mode placeholder. See
`decisions/ADR-006-cyberpunk-reference-visual-system.md`.

**Do not** “fix” the title screen into a dark theme because the rest of the app is dark. Internal
screens use a yellow top bar over black; the landing hero is deliberately yellow.

## 10. No proprietary Cyberpunk fonts or artwork

**Why:** the reference uses Blender Pro, Refinery-25, Integral, Halis GR, and Proxima Nova, plus
copyrighted character art. Those files are not licensed for redistribution here. We use OFL
lookalikes and original vector art. See `docs/design-system.md` and
`decisions/ADR-006-cyberpunk-reference-visual-system.md`.

**Do not** download fonts or images from the reference site and bundle them. If the project licenses
them, record it in an ADR and include the license files first.
