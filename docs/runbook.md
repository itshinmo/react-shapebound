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
- Routes are clean paths with `BrowserRouter`. Vite dev and preview provide history fallback; a
  static host must serve `index.html` for unknown paths with a 200 response.
- `dist/` can be served from a domain root. For a subpath deployment, set Vite `base` and the router
  `basename` together; configuring only one breaks routing or asset URLs.
- Offline currently means **no network after the page loads**. Fonts are bundled; there are no API
  calls, remote images, analytics, or runtime font CDNs.
- A service worker/PWA is **not** included. Do not open `dist/index.html` directly with `file://`:
  browsers block module scripts under that scheme. Serve it with `pnpm preview` or any static server.

## Save recovery

Local data lives in `localStorage`:

```text
shapebound:settings   { version: 2, reducedMotion: boolean, glowIntensity: 0-100 }
shapebound:save       { schemaVersion: 1, savedAt: ISO string, data: ProgressionData }
```

`ProgressionData` is exactly `{ bluePoints, bestTimeMs, runCount, bossCurrencies: { purple, green,
orange } }`. It is the progression record, not an active run: the current seed, clock, points, enemy
state, and commit latch are in memory only. There is no mid-run save or resume.

- **Missing key** (`none`): base values are all zero. This is not an error. The first committed death
  writes a fresh record, even for a zero-point run.
- **Valid record**: the saved balance, best time, run count, and boss currencies are used.
- **Unreadable record** (`invalid-json`, `invalid-envelope`, `invalid-data`, or
  `unsupported-version`): nothing is written or overwritten, and the run-over offers `/settings` as
  the recovery route. Later deaths remain unreadable until the record is cleared.
- **Storage unavailable**: the browser is blocking storage. Nothing is written; `/settings` reset
  cannot repair an absent storage API, so it is not presented as the fix.
- **Failed write** after a valid read: the run-over shows `SAVE FAILED — POINTS NOT SAVED` and a
  `Retry save` control. Retry writes the same latched envelope; it never adds the run twice. Leaving
  discards the unsaved points.

To recover:

1. Open **Settings → Local data → Clear local data → Confirm reset**.
2. Or remove the two keys in DevTools → Application → Local Storage.
3. Reload.

A reset removes both `shapebound:settings` and `shapebound:save`, resets settings to system defaults,
writes the settings defaults again, and leaves the save key absent. `/skills` then shows the zero
base and the next committed death writes a fresh v1 record. The pause-menu config cannot reset local
data. A failed settings write (quota, private mode) is reported as `false` and does not crash the app;
the session continues without persistence. Version 1 settings records are migrated on read with
`glowIntensity: 100` and rewritten as version 2.

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

**Storage is unavailable.** Private/locked-down contexts can throw on access. Settings fall back to
system defaults and skip persistence; the progression read is `unavailable`, so a death writes
nothing and the run-over says the run was not saved. This is expected, not a crash. A reset cannot
repair an absent storage API.

**Glow intensity does not change the header, buttons, or panels.** That is intentional. The setting
drives every in-run surface: `glow-arena`, `glow-player`, `glow-joystick`, `glow-enemy` (both enemy
bodies), `glow-warning` (warning lane and beam), `glow-track` (timeline line and future/current
nodes), `glow-hud` (boss banner and pause connector), `glow-danger` (run-over panel), plus the static
settings/pause preview. The HUD timer/points/legend/scrim, menu button, pause dialog frame/buttons,
and all focus rings stay fixed or unglowed. Presentation pages keep fixed `shadow-glow-*` tokens and
never read the variable.

**The reduce-motion switch still moves while reduced motion is on.** Its 150ms thumb feedback is the
sole exception; the control's position is its state feedback. All other animations and transitions
are disabled.

**A rotate-to-landscape screen blocks the game.** This is intentional on `/play`. The title,
settings, skills, and not-found pages are responsive and do not require landscape. Rotate the device
or widen the window. The run stays mounted and frozen behind the gate; on return to landscape the
gate disappears, the pause menu opens once, and the run waits for Resume. It does not respawn or
auto-resume.

**Fullscreen or orientation lock does not happen.** On touch devices, `/play` shows a start overlay;
the tap is the required user gesture for fullscreen and `screen.orientation.lock('landscape')`.
Android Chrome supports both; iOS/Safari and most desktop browsers cannot lock orientation. Failure is
non-blocking and the rotate overlay is the fallback. There is no PWA or manifest orientation policy.

**A deep link 404s on a static host.** `BrowserRouter` needs history fallback: configure the host to
serve `index.html` for unknown paths with a 200 response. Vite dev/preview already do this. For a
subpath deployment, set Vite `base` and the router `basename` together.

**The joystick does not appear.** It is touch/pen only, and only after the run starts. A mouse click
does not create one; a second simultaneous touch is ignored. Releasing or cancelling the pointer
hides it and zeroes movement. It also clears on window blur or a hidden tab.

**The run keeps freezing, or the pause menu opens by itself.** Freeze reasons stack: `pause`,
`hidden`, `portrait`, and `focus`. The pause button or Escape adds `pause`; only Resume removes it. A
hidden tab adds `hidden`; window blur while the document is visible adds `focus`. Neither opens a
menu, and both resume only when no other reason remains. Portrait adds `portrait`; returning to
landscape removes it, adds `pause`, and opens the menu once. The pause config keeps the run frozen
while settings change. The run-over is terminal; rotating after death shows the gate and then the
run-over, with no pause reason.

**The player resets after reloading, pressing back, or leaving `/play`.** That is expected: there is
no active-run save. Reload, browser back, route change, Restart, and Retry discard the run. Portrait,
a hidden tab, and focus loss preserve the in-memory run while the page stays mounted; they are not
persistence.

**A death says the points were not saved.** Read the run-over status. `failed` is a write failure;
`Retry save` retries the same latched total and never adds it twice. `unreadable` means the existing
save is corrupt and nothing was overwritten; open Settings to reset local data, then the next death
can write a fresh record. `unavailable` means the browser is blocking storage; a reset cannot repair
that. `pending` is the commit in progress. See [Save recovery](#save-recovery).

**`/skills` shows no points after a completed run.** The page reads only the committed save. A
missing record, a failed/unreadable/unavailable commit, or a run that was restarted before death
leaves no new balance. Check the run-over status first. `/skills` never shows the current run's
unsaved points. Its `START A RUN` footer link appears only for a readable zero balance; with a
positive balance, start a run from the header or title.

**`/skills` shows zero best time or run count with a zero balance.** The empty state is not an
error. Best time and run count remain the real saved values even when the blue balance is zero. A
reset clears both keys, so all three return to zero.

**The Skill Tree item in the pause menu does nothing.** It is intentionally locked during a run
(`aria-disabled`, reason `AVAILABLE AFTER THE RUN`). Finish the run or leave to `/skills`.

**The boss banner appears but no boss does.** The five-minute banner is a marker only. There is no
boss entity, fight, attack, health, defeat, or currency award in this slice; the run continues
through the banner.

**The player container is off-screen or the wrong size.** The player container is a static, centered
square (`PLAYER_CONTAINER_SIZE` in `src/game/player.ts`, currently 320 px). The screen is not a
collision boundary; on a very small viewport the container may exceed the safe playfield. Adjust the
starting size or the supported landscape viewport floor. The player should stop at the container
outline; if it crosses, the container bounds are wrong.

**Testing landscape on desktop.** Use DevTools device emulation or resize the window. On `/play`, a
portrait viewport should show the blocking overlay while the run stays mounted and frozen; the title,
settings, and skills pages should stay usable in both orientations. There is no E2E suite yet.

**Windows symlink adapters.** `.claude`, `.opencode`, and `.agents` point into `.ai/`. Enable
`core.symlinks` (`git config --global core.symlinks true`) or replace each symlink with a one-line
pointer file. Do not copy the contents.

## Dependency policy

- Runtime dependencies: `react`, `react-dom`, `react-router`, and the four Fontsource asset packages
  (ADR-001, ADR-005).
- Build/test tooling is a dev dependency.
- Check [`docs/dependency-candidates.md`](dependency-candidates.md) before adding any package. Stop
  and notify the author with the problem, candidate, current alternative, type, and estimated cost;
  do not install without approval.
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

- Boss entities, boss fights, boss attacks, boss health, boss defeat, and boss currency awards.
- Node unlocking, upgrades, costs, respec, and spending.
- Player attack, aiming, enemy health, and a win condition.
- Active-run persistence, mid-run save, resume, run history, and a saved run seed/cursor.
- PWA/service worker and install prompt.
- E2E browser tests.
- Audio and haptics.
- Save-slot UI.
