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
on pushes and pull requests. `.github/workflows/deploy.yml` runs the same gate on pushes to `main`
(and manual dispatch from `main`), deploys the Pages artifact, and refreshes the `gh-pages` snapshot.

## Static hosting and “offline”

- `vite.config.ts` uses `base: process.env.VITE_BASE ?? '/'`. Local dev, build, and preview use `/`;
  the deploy workflow builds with `/react-shapebound/`.
- Routes are clean paths with `BrowserRouter`; the router `basename` is derived from
  `import.meta.env.BASE_URL`. A static host must serve `index.html` for unknown paths. Vite dev and
  preview provide that fallback locally.
- GitHub Pages cannot return a 200 for an unknown path. The deploy workflow copies `dist/index.html`
  to `dist/404.html`; a direct link such as `/react-shapebound/play` boots the app, but the first
  response is HTTP 404. This is accepted for a game with no SEO requirement.
- GitHub Pages serves the build artifact at <https://itshinmo.github.io/react-shapebound/>.
  `.github/workflows/deploy.yml` uploads `dist/` and deploys it with `actions/deploy-pages` on every
  push to `main` and on manual dispatch from `main`. One-time setup: set **Pages → Source** to
  **GitHub Actions**. The workflow also force-pushes a fresh `gh-pages` snapshot; that branch is a
  best-effort build snapshot, not the Pages publishing source.
- Offline currently means **no network after the page loads**. Fonts are bundled; there are no API
  calls, remote images, analytics, or runtime font CDNs.
- A service worker/PWA is **not** included. Do not open `dist/index.html` directly with `file://`:
  browsers block module scripts under that scheme. Serve it with `pnpm preview` or any static server.

## Save recovery

Local data lives in `localStorage`:

```text
shapebound:settings   { version: 2, reducedMotion: boolean, glowIntensity: 0-100 }
shapebound:save       { schemaVersion: 2, savedAt: ISO string, data: ProgressionData }
```

`ProgressionData` is exactly `{ bluePoints, bestTimeMs, runCount, bossCurrencies: { purple, green,
orange }, upgrades: { barrierCount, movementSpeed, playerSize, arenaSize, reflectCharges,
reflectChargeSpeed, laserPierce } }`. It is the progression record, not an active run: the current
seed, clock, points, enemy state, and commit latch are in memory only. There is no mid-run save or
resume.

- **Missing key** (`none`): base values are all zero, including all seven upgrade levels. This is not
  an error. The first committed death writes a fresh v2 record, even for a zero-point run.
- **Valid v2 record**: the saved balance, best time, run count, boss currencies, and upgrade levels are
  used. `/skills` can purchase levels or Reset Skills; a purchase or reset writes one full v2 envelope.
- **Valid v1 record**: readable. It is migrated in memory to v2 with all seven levels at zero and the
  four base fields preserved. Reading does not rewrite it; the stored bytes stay schema 1 until the
  next committed death or tree purchase/reset writes v2.
- **Unreadable record** (`invalid-json`, `invalid-envelope`, `invalid-data`, or
  `unsupported-version`): nothing is written or overwritten. A new run is blocked by the `/play` save
  gate, which offers `/settings` as the recovery route. `/skills` shows its read-error panel and no
  fabricated values. Later attempts remain blocked until the record is cleared.
- **Storage unavailable**: the browser is blocking storage. Nothing is written or started;
  `/settings` reset cannot repair an absent storage API, so it is not presented as the fix.
- **Failed write** after a valid read: the run-over shows `SAVE FAILED — POINTS NOT SAVED` and a
  `Retry save` control. Retry writes the same latched envelope; it never adds the run twice. Leaving
  discards the unsaved points. A failed tree write leaves the displayed levels and balance unchanged
  and the next activation re-reads.

To recover:

1. Open **Settings → Local data → Clear local data → Confirm reset**.
2. Or remove the two keys in DevTools → Application → Local Storage.
3. Reload.

A reset removes both `shapebound:settings` and `shapebound:save`, resets settings to system defaults,
writes the settings defaults again, and leaves the save key absent. `/skills` then shows the zero
base and the next committed death writes a fresh v2 record. The pause-menu config cannot reset local
data. A failed settings write (quota, private mode) is reported as `false` and does not crash the app;
the session continues without persistence. Version 1 settings records are migrated on read with
`glowIntensity: 100` and rewritten as version 2.

**Reset Skills vs local-data reset.** Reset Skills on `/skills` is an in-game transaction: it clears
all seven upgrade levels, refunds their sum (capped at `MAX_BLUE_POINTS`), and preserves best time, run
count, and boss currencies. It does not remove the save key or settings. **Settings → Clear local
data** removes the whole save and every upgrade. Do not use one as the other.

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
system defaults and skip persistence; the progression read is `unavailable`, so a new run is blocked
by the `/play` save gate and a death in an already-started run cannot be committed. This is expected,
not a crash. A reset cannot repair an absent storage API.

**Glow intensity does not change the header, buttons, or panels.** That is intentional. The setting
drives every in-run surface: `glow-arena`, `glow-player`, `glow-joystick`, `glow-enemy` (bodies and
explosions), `glow-warning` (warning lane and beam), `glow-track` (timeline, shield line, instant
reflected beams, and previews), `glow-hud` (boss banner and pause connector), `glow-danger` (run-over
panel), plus
the static settings/pause preview. The charge ring and barrier notches intentionally have no
independent glow. The HUD timer/points/legend/scrim, menu button, pause dialog frame/buttons, and all
focus rings stay fixed or unglowed. Presentation pages keep fixed `shadow-glow-*` tokens and never
read the variable.

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

**A deep link shows GitHub's 404 page.** The deployed build must include `dist/404.html`; the deploy
workflow copies it from `index.html`. The initial response for a route such as
`/react-shapebound/play` is HTTP 404 by design, but the app should boot. If GitHub's own 404 page
appears instead, check the deploy log and confirm the Pages source is **GitHub Actions**. In-app
navigation works without the fallback; a hard refresh or a shared deep link needs it.

**The deploy workflow fails at “Deploy to GitHub Pages.”** The repository's Pages source is not
**GitHub Actions**. Open **Settings → Pages → Build and deployment → Source**, select **GitHub
Actions**, then re-run the workflow. The `gh-pages` branch is only a snapshot and must not be selected
as the source; a `GITHUB_TOKEN` push to it does not trigger a Pages build.

**The “Publish gh-pages snapshot” step fails but the site deployed.** The snapshot is best-effort.
The Pages artifact deploy does not depend on it. Check whether `gh-pages` is protected or the
workflow token lacks `contents: write`; the site is still current if the deploy job succeeded.

**The joystick does not appear.** It is touch/pen only, and only after the run starts. A mouse click
does not create one. The first non-mouse pointer is movement. If the shield joystick does not appear,
the run may be at Reflect Charges level 0, have 0 current charges, already have a shield pointer
latched, or be in a spent press; release and re-touch after a charge exists. A third simultaneous
pointer is ignored. Releasing or cancelling a pointer hides that joystick; releasing movement keeps a
latched shield. Both clear on window blur, hidden tab, pause, portrait, and death.

**The right mouse button does not raise the shield.** The run needs Reflect Charges level 1+ and a
current charge. Hold the right button on the play surface, not on the pause button or the HUD strip;
right-clicking a HUD control does not engage or pause. A left click does nothing. Release, window
blur, hidden tab, pause, portrait, and death disengage, and resuming needs a new press. There is no
keyboard parry by design. The play surface suppresses its context menu.

**The shield line does not reflect an orange beam.** The run needs Reflect Charges level 1+ and a
current charge. The warning lane must approach the shield's **outward** face and contact it before
the player hurtbox; an exact tie reflects, while a player-first contact damages. A near-parallel beam
(`abs(d·n) < 0.35`) is grazing and is not reflected. On a successful parry the original orange beam
stops at the shield, an instant 12 px cyan beam starts at the **shield midpoint**, one charge is spent, and
the beam kills up to `1 + Laser Pierce` normal enemies in distance order. It passes through all allowed
targets; if the budget is exhausted it stops after the last allowed kill, otherwise it continues to the
viewport edge. It does not travel over time, and does not damage the player or a boss. If the last
charge is spent, release and press again after the ring grants a charge; a held input stays `spent`
and does not re-arm.

**No preview appears before a beam.** Previews appear only for a charging triangle warning whose lane
would reflect: active shield, an available charge, outward face, shield contact before the player, and
non-grazing. The dim lanes show the predicted path to the last allowed target or the viewport edge.
Release, freeze, death, a non-reflecting aim, or the last charge hides them.

**A triangle hit me after I reflected its laser.** The shield reflects the laser only; it does not
block triangle body contact. Triangle body contact deals one damage once per activation, consuming
barrier first. Reflecting a beam does not make the player immune to the body.

**A kill did not refill a barrier notch.** A reflected kill rolls the dedicated 5% `[unverified]`
barrier-drop stream. The roll happens at max barrier and at Barrier Count 0, but it may grant zero,
and a drop cannot absorb a hit that already landed in the same step. Barrier does not regenerate;
the drop is the only in-run gain.

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
unsaved points. Readable states show `START A RUN`. An unreadable save shows the `/settings` recovery
route and Back to title; an unavailable save shows Back to title only, because a reset cannot repair
blocked storage.

**`/skills` shows zero best time or run count with a zero balance.** The empty state is not an
error. Best time and run count remain the real saved values even when the blue balance is zero. A
local-data reset clears both keys, so all three return to zero; Reset Skills preserves both.

**A node will not raise a level.** Every level costs exactly 1 blue point. At node max the card shows
`MAX` and announces the maximum; at zero balance it announces the missing point. Neither writes.
Purchases are add-only; there is no minus/right-click/long-press removal. To change a build, use
`Reset Skills`, confirm, and redistribute the refunded points.

**A tree purchase or reset says the save failed.** The stored record is unchanged and the displayed
levels/balance stay at the old values. Do not repeat it blindly: the next activation performs a fresh
read. If the save is unreadable, use `/settings` local-data reset (which clears the whole tree); if
storage is unavailable, the browser is blocking persistence and a reset cannot repair it.

**`/play` shows a save gate instead of the board.** A new run requires a readable save. `SAVED
PROGRESS COULD NOT BE READ` points to `/settings`; `LOCAL STORAGE IS UNAVAILABLE` has no repair, only
Back to title. Retry and pause Restart run the same gate and redirect here instead of starting a
base-loadout run. No run, player, enemy world, or loadout exists while the gate is shown.

**The Skill Tree item in the pause menu does nothing.** It is intentionally locked during a run
(`aria-disabled`, reason `AVAILABLE AFTER THE RUN`). Finish the run or leave to `/skills`.

**The boss banner appears but no boss does.** The five-minute banner is a marker only. There is no
boss entity, fight, attack, health, defeat, or currency award in this slice; the run continues
through the banner.

**The player container is off-screen or the wrong size.** The player container is a static, centered
square sized from the captured `RunLoadout` (`arenaSize`, 320–420 px by Arena Size level). The screen
is not a collision boundary; on a very small viewport the configured square may exceed the measured
playfield, so the player clamps to the smaller measured inner box. Check the saved upgrade levels and
the supported landscape viewport floor. The player should stop at the container outline; if it
crosses, the container bounds are wrong.

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
- Direct player attack, aiming, enemy health beyond an instant reflected-beam kill, and a win condition.
- Active-run persistence, mid-run save, resume, run history, and a saved run seed/cursor.
- PWA/service worker and install prompt.
- E2E browser tests.
- Audio and haptics.
- Save-slot UI.
