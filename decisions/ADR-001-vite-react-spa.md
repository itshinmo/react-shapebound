# ADR-001 — Vite + React SPA with hash routing

- **Status:** Superseded by ADR-010
- **Date:** 2026-10-21
- **Topic:** app architecture
- **RFC:** —

## Context

react-shapebound is a single-player, offline browser game with no backend, no accounts, and no server
data. The author chose TypeScript, React, React Router, and Vite. The UI must render with HTML
elements, not canvas. The build must be deployable as static assets from any path, and the game must
continue working without a network after load.

The main alternatives were a server-rendered framework (Next.js), React Router framework mode, and a
plain Vite SPA. There is no server-side data, SEO requirement, or hosting infrastructure to justify
SSR.

## Decision

Use a **Vite 8 single-page app** with **React 19**, **TypeScript 6**, and **React Router 8 in
declarative mode** with `HashRouter`. Set Vite `base: './'` and build to `dist/`.

Route table: `/`, `/play`, `/settings`, `*`. Routing lives in `src/app/app.tsx`.

## Options considered

- **Next.js static export** — strong routing and image tooling, but adds a server-oriented framework,
  conventions, and dependencies for a client-only game. Con: unnecessary abstraction and bundle.
- **React Router framework mode (SPA)** — file routes and type-safe route modules, but ties the build
  to the framework plugin and adds conventions the game does not need yet. Con: more moving parts.
- **React Router data mode** — route loaders/actions and error elements. Con: there is no server data
  layer; the features would be unused.
- **Declarative + BrowserRouter** — clean URLs, but requires host rewrite configuration. Con: breaks
  when served from a subpath or a host without SPA fallback.
- **Declarative + HashRouter (chosen)** — thin router, no server requirements, works from any static
  path.

## Rationale

The game needs navigation between screens, not a data-loading framework. Declarative mode keeps the
router a navigation library; data mode can be adopted later if save-slot loaders or navigation
blockers become real requirements. Hash routing trades URL aesthetics for deployment robustness,
which is the right trade for an offline/static game. Relative asset paths make the build portable.

## Consequences

- URLs contain `#` (`/#/play`). This is deliberate; see `docs/decisions-not-to-fix.md`.
- No SSR, no server functions, no API routes.
- Static hosting needs no rewrite rule. Opening `dist/index.html` via `file://` is still not supported
  because browsers block module scripts; serve it over HTTP (`pnpm preview` or any static host).
- If clean URLs become a requirement, write an ADR: switch to `BrowserRouter`, configure fallback,
  update the runbook and tests.
- No PWA/service worker is included. Offline means “no network after load”, not installability.
- The production bundle includes React, React Router, and locally bundled fonts only.
