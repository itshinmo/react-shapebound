# ADR-002 — DOM-only rendering, no canvas

- **Status:** Accepted
- **Date:** 2026-10-21
- **Topic:** rendering
- **RFC:** —

## Context

The author requires the game to be built from HTML elements rather than canvas. The game is
single-player and offline, with a UI that should remain inspectable, accessible, and testable. A
canvas renderer would make text selection, focus management, semantic roles, and DOM-based testing
much harder, and would introduce a second rendering model alongside React.

## Decision

Render the game with **DOM elements and CSS only**. Do not add `<canvas>`, WebGL, or a canvas-backed
library (PixiJS, Phaser, Three.js, etc.), including for “small” effects.

The only SVG allowed is decorative or iconographic inline SVG that is not a game rendering surface
(the identity mark is an example). Motion uses CSS transforms/opacity. The board scaffold is a CSS
grid, explicitly marked non-functional and `aria-hidden`.

## Options considered

- **Canvas 2D** — good for many sprites and pixel effects. Con: loses DOM accessibility/testing,
  duplicates layout, requires a render loop and asset pipeline.
- **WebGL** — highest performance. Con: far more complexity than this game needs; inaccessible by
  default.
- **Hybrid (DOM UI + canvas board)** — keeps menus accessible but creates two rendering models and a
  boundary that leaks. Con: complexity without a demonstrated need.
- **DOM + CSS (chosen)** — semantic, inspectable, testable, styleable with the existing design system.
  Con: a performance ceiling for thousands of animated nodes.

## Rationale

The product is a DOM game by author decision. The DOM gives keyboard access, focus, semantic roles,
text rendering, CSS layout, and Testing Library coverage for free. It also keeps the design system
coherent: one set of tokens and Tailwind utilities styles the entire interface. The performance
ceiling is acceptable until a mechanic proves otherwise.

## Consequences

- Animate `transform` and `opacity`; avoid layout thrash and per-frame React state for decoration.
- Large numbers of moving nodes are a design constraint, not a reason to add canvas.
- If a future mechanic genuinely cannot be expressed in the DOM, the author must approve an RFC/ADR
  that revisits this decision. Do not add canvas “temporarily”.
- The play screen is a non-interactive preview until mechanics exist. It must not imply gameplay.
- Accessibility is a design input: keyboard paths, focus, contrast, and reduced motion are required.

See `docs/decisions-not-to-fix.md`.
