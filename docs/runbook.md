# Runbook

## Prerequisites

- Node **>= 24** (the scaffold was created on Node 26.11).
- pnpm **12.11** (pinned by `packageManager`; use Corepack).
- Git.

```sh
corepack enable
pnpm install
```

`pnpm install` also runs `prepare`, which sets `core.hooksPath` to `.githooks`.

## Daily commands

```sh
pnpm dev            # Vite dev server, http://localhost:5173 (strictPort)
pnpm build          # tsc -b + vite build → dist/
pnpm preview        # static preview, http://localhost:4173 (strictPort)
pnpm lint           # ESLint, zero warnings
pnpm format         # Prettier write
pnpm typecheck      # tsc -b
pnpm test           # Vitest run
pnpm check          # format:check + lint + typecheck + test + docs:check
pnpm verify         # check + build
```

If a dev server is already using 5173/4173, stop it; the ports are intentionally strict to avoid
silent multiple instances.

## Git hook

- Versioned hook: `.githooks/pre-push`.
- Installed by `prepare`; repair with `pnpm hooks:install`.
- It runs `pnpm check`. A failed check aborts the push.
- Emergency bypass: `git push --no-verify`. Use only when you understand the failing gate; CI still
  runs the same checks.

CI: `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build`
on pushes and pull requests.

## Static hosting and “offline”

- `vite.config.ts` uses `base: './'` so assets resolve relative to the document.
- `HashRouter` means routes live after `#`, so no server rewrite is required.
- `dist/` can be served from a domain root or any subpath by a static host or `pnpm preview`.
- Offline currently means **no network after the page loads**. Fonts are bundled; there are no API
  calls, remote images, analytics, or runtime font CDNs.
- A service worker/PWA is **not** included. Do not open `dist/index.html` directly with `file://`:
  browsers block module scripts under that scheme. Serve it with `pnpm preview` or any static server.

## Save recovery

Local data lives in `localStorage`:

```text
shapebound:settings   { version: 1, reducedMotion: boolean }
shapebound:save       { schemaVersion: 1, savedAt: ISO string, data: T }
```

To recover:

1. Open **Settings → Local data → Clear local data → Confirm reset**.
2. Or remove the two keys in DevTools → Application → Local Storage.
3. Reload.

A failed write (quota, private mode) is reported as `false` and does not crash the app; the session
continues without persistence. The settings provider resets to system defaults and writes them again
after a reset.

## Troubleshooting

**A Tailwind class has no effect.** Class names must be statically visible. Do not build them by
concatenation. Custom utilities live in `src/styles/global.css` (`@utility`). Restart the dev server
after editing the theme/utilities.

**Styles look unsorted or conflicting.** Run `pnpm format` (the Tailwind Prettier plugin sorts
classes). `cx()` joins classes; it does not resolve conflicts. Use a variant prop instead of passing
an overriding utility.

**ESLint/TypeScript errors after a dependency bump.** The toolchain is deliberately pinned:
TypeScript 6.0 + `typescript-eslint` 8.72 (`<6.1`), ESLint 9.39 + `eslint-plugin-jsx-a11y` 6.10
(`^9`). Run `pnpm peers check`; update the matrix together and re-run `pnpm verify`.

**TypeScript complains about `baseUrl`.** It was removed because TypeScript 6 deprecates it. `paths`
works without it; add imports through the `@/` alias.

**Fonts look wrong or missing.** Fonts are imported from `@fontsource/*` in `src/main.tsx` and emitted
into `dist/assets`. Do not replace them with a Google Fonts URL — that breaks the offline rule.

**Storage is unavailable.** Private/locked-down contexts can throw on access. The app falls back to
defaults and skips persistence; this is expected, not a crash.

**A rotate-to-landscape screen blocks the game.** This is intentional on `/play`. The title,
settings, and not-found pages are responsive and do not require landscape. Rotate the device or widen
the window; the play surface remounts when landscape returns.

**Fullscreen or orientation lock does not happen.** On touch devices, `/play` shows a start overlay;
the tap is the required user gesture for fullscreen and `screen.orientation.lock('landscape')`.
Android Chrome supports both; iOS/Safari and most desktop browsers cannot lock orientation. Failure is
non-blocking and the rotate overlay is the fallback. There is no PWA or manifest orientation policy.

**The joystick does not appear.** It is touch/pen only, and only after the run starts. A mouse click
does not create one; a second simultaneous touch is ignored. Releasing or cancelling the pointer
hides it and zeroes movement. It also clears on window blur or a hidden tab.

**The player resets after rotating to portrait.** The play gate replaces the play surface, so it
unmounts. This slice has no saved run state; the player respawns centered. Revisit the gate when run
state becomes persistent.

**The player can leave the visible screen in fullscreen.** The playfield is intersected with
`window.visualViewport`, which corrects the mobile Firefox layout-viewport/cutout mismatch. If a
device still allows the player over the visible edge, record the browser, version, and device; the
viewport intersection may need another platform-specific rule.

**Testing landscape on desktop.** Use DevTools device emulation or resize the window. On `/play`, a
portrait viewport should show the blocking overlay; the title and settings should stay usable in both
orientations. There is no E2E suite yet.

**Windows symlink adapters.** `.claude`, `.opencode`, and `.agents` point into `.ai/`. Enable
`core.symlinks` (`git config --global core.symlinks true`) or replace each symlink with a one-line
pointer file. Do not copy the contents.

## Dependency policy

- Runtime dependencies: `react`, `react-dom`, `react-router`, and the three Fontsource asset packages
  (ADR-001, ADR-005).
- Build/test tooling is a dev dependency.
- A new **runtime** dependency needs an ADR. Prefer zero; the game should not accumulate convenience
  libraries.
- `pnpm-lock.yaml` is generated. Do not hand-edit it.

## Current version matrix

| Tool         | Version |
| ------------ | ------- |
| Node         | >= 24   |
| pnpm         | 12.11   |
| React        | 19.3    |
| Vite         | 8.3     |
| React Router | 8.5     |
| TypeScript   | 6.0     |
| Tailwind CSS | 4.3     |
| ESLint       | 9.39    |
| Vitest       | 5.0     |

## Not included yet

- PWA/service worker and install prompt.
- E2E browser tests.
- Audio.
- Save-slot UI.
- HUD, pause, and a visible exit control.
- Combat, enemies, bosses, points, the skill tree, and run/death progression.
