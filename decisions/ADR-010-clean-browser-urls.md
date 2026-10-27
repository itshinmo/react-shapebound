# ADR-010 — Clean browser URLs with a static-host fallback

- **Status:** Accepted
- **Date:** 2026-10-23
- **Topic:** routing / static hosting
- **RFC:** —
- **Supersedes:** [ADR-001](ADR-001-vite-react-spa.md)
- **Amended by:** [ADR-016](ADR-016-github-pages-deployment.md) — `VITE_BASE` base/basename pairing and the GitHub Pages `404.html` fallback

## Context

ADR-001 chose `HashRouter` so the static SPA could be served from any path without server rewrite
rules. The author now requires clean URLs (`/play`, `/settings`, `/missing`) rather than
`/#/play`. Vite's dev and preview servers already provide history fallback; a static host must be
configured to serve `index.html` for unknown paths. Subpath hosting also requires the Vite base and
the router basename to agree.

## Decision

- Use React Router's **`BrowserRouter`** for the app. Routes are clean paths.
- Keep Vite `base: './'` and relative assets. The app is expected to be served at the site root; for
  a subpath deployment, set Vite `base` and `BrowserRouter` `basename` together.
- Static hosts must serve `index.html` for unknown paths with a 200 response. This covers direct
  links such as `/play` and `/settings`.
- Vite dev and preview provide the fallback locally. Opening `dist/index.html` via `file://` remains
  unsupported.
- No hash URLs for application routes. The `#main-content` skip link is an in-page fragment, not a
  route.

## Options considered

- **Keep `HashRouter` (ADR-001).** Con: hash URLs are not the clean paths the author requires.
- **`BrowserRouter` with a host fallback (chosen).** Clean URLs; requires static-host configuration.
- **`MemoryRouter`.** Con: no addressable URLs; unsuitable for direct links.
- **Server-rendered or framework routing.** Con: no backend; unnecessary for the offline SPA.

## Rationale

Clean URLs are a product requirement. The tradeoff is explicit: the static host needs an SPA
fallback, and subpath hosting needs matching base/basename configuration. The app remains a
client-only, offline-after-load SPA with no server data or API.

## Consequences

- Deep links require a host fallback; without it, `/play` and `/settings` 404 on a static host.
- The Vite dev and preview servers work without extra configuration.
- A subpath deployment needs both Vite `base` and `BrowserRouter` `basename`; do not configure only
  one.
- ADR-001 is superseded; its Vite + React + SPA + relative-asset decisions remain in force through
  this ADR.
- Tests navigate with `window.history` instead of `window.location.hash`.
- Update `docs/architecture.md`, `docs/runbook.md`, `README.md`, `docs/overview.md`,
  `docs/decisions-not-to-fix.md`, `docs/components.md`, `.ai/memories/*`, and the routing tests.
