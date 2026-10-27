# ADR-016 — GitHub Pages deployment via Actions artifact and a gh-pages snapshot

- **Status:** Accepted
- **Date:** 2026-10-27
- **Topic:** deployment / static hosting
- **RFC:** —
- **Amends:** [ADR-010](ADR-010-clean-browser-urls.md) — GitHub Pages base/basename details and the `404.html` fallback

## Context

[ADR-010](ADR-010-clean-browser-urls.md) chose `BrowserRouter` with clean URLs, a host that serves
`index.html` for unknown paths with a 200 response, and matching Vite `base` and router `basename`
for subpath hosting. The project now deploys to GitHub Pages at
<https://itshinmo.github.io/react-shapebound/> from the `itshinmo/react-shapebound` repository.

Two GitHub Pages constraints shape the deployment:

- Pages is static and cannot rewrite arbitrary paths to `index.html` with a 200 response. A
  `404.html` copy can boot the app, but the first request still returns HTTP 404.
- A commit pushed by a workflow using `GITHUB_TOKEN` does not trigger a Pages build. A workflow that
  only force-pushes `gh-pages` can go green while Pages keeps serving the previous build.

The author also wants a `gh-pages` branch that always contains the latest build.

## Decision

- Keep `BrowserRouter` and clean URLs from ADR-010. Set Vite `base` to `/` locally and
  `/react-shapebound/` in the deploy build through `VITE_BASE`; derive the router `basename` from
  `import.meta.env.BASE_URL`.
- Run `.github/workflows/deploy.yml` on pushes to `main` and on manual dispatch from `main`. The
  workflow runs `pnpm check` and `pnpm build`, copies `dist/index.html` to `dist/404.html`, and adds
  `dist/.nojekyll`.
- Publish with the official Pages artifact deployment: `actions/upload-pages-artifact` and
  `actions/deploy-pages`. The Pages source is **GitHub Actions**. The deploy job uses the
  `github-pages` environment with `pages: write` and `id-token: write`, and fails if the deployment
  fails.
- Also force-push a fresh orphan `gh-pages` branch containing `dist/` at the root. The snapshot push
  is best-effort (`continue-on-error`) and is not the Pages publishing source.
- Do not use a deploy key or personal access token for the branch push.

## Options considered

- **Publish from the `gh-pages` branch with `GITHUB_TOKEN`.** Simple, but Pages does not build
  commits pushed by `GITHUB_TOKEN`; the site would stay stale. Rejected.
- **Publish from `gh-pages` with a deploy key or PAT.** Keeps the branch as the source and triggers a
  build, but adds a long-lived credential and branch-protection constraints. Rejected because the
  artifact deployment is supported and secret-free.
- **Use a host with SPA history rewrites (Netlify, Vercel, Cloudflare Pages).** Clean URLs with 200
  responses, but adds a hosting migration outside GitHub Pages. Rejected.
- **Use hash routing.** Avoids the `404.html` fallback but makes the router ignore the pathname, so
  arbitrary paths such as `/ax#/skills` render app routes. Rejected after review.
- **Official Pages artifact plus a `gh-pages` snapshot (chosen).** No secret, the deployment is
  verified by `actions/deploy-pages`, and the branch still contains the latest build.

## Rationale

GitHub Pages is the chosen host. The official artifact deployment is the supported way to publish a
custom build, and it reports deployment failures instead of leaving a green workflow with a stale
site. The `gh-pages` branch is kept because the author wants the build available there, but it is a
snapshot rather than the source. A `404.html` fallback makes direct deep links boot the app; the
404 status is an accepted limitation for a game with no SEO requirement.

## Consequences

- Pages source must be **GitHub Actions**, not the `gh-pages` branch. Set **Settings → Pages → Build
  and deployment → Source** once before the first deployment. If it is wrong, the deploy job fails.
- `VITE_BASE` must be `/react-shapebound/` when building for Pages. Local `pnpm build` uses `/`.
- The deployed build uses absolute `/react-shapebound/` asset URLs. The `gh-pages` snapshot is only
  portable at that subpath.
- Direct links such as `/react-shapebound/play` are served by `404.html` and return HTTP 404 even
  though the app renders the play screen.
- The snapshot push is best-effort. If `gh-pages` is protected or the token cannot write, the Pages
  artifact still deploys and the snapshot step reports the failure.
- No deploy key, PAT, or third-party deploy action is required. The workflow uses official GitHub
  Pages actions; the existing `pnpm/action-setup` build action is unchanged.
- ADR-010 remains Accepted. This ADR records the GitHub Pages-specific fallback and deployment
  mechanism.
