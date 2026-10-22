# Pull request

## Summary

_What changed and why. Link the spec, RFC, or ADR._

- Spec / RFC / ADR:
- Screens affected:

## Type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs / process
- [ ] Tooling / dependency

## Definition of done

- [ ] `pnpm check` passes with zero warnings.
- [ ] `pnpm build` passes when the app, build config, or styling changed.
- [ ] Layer boundaries hold; no canvas; no runtime network calls.
- [ ] New behavior has tests (domain unit tests and/or component tests).
- [ ] Docs updated in the same change; changed Markdown links resolve.
- [ ] A decision has an ADR; a shipped RFC has an ADR and is archived.
- [ ] A new runtime dependency has an ADR.
- [ ] No secrets, tokens, or private hostnames.
- [ ] No hand-edited `dist/`, `coverage/`, or `pnpm-lock.yaml`.
- [ ] UI changes checked at mobile and desktop widths; keyboard and reduced motion verified.
- [ ] Diff reviewed by the author.

## Verification

```text
pnpm check:
pnpm build:
Manual checks:
```

## Notes / follow-ups

_Anything unresolved, intentionally out of scope, or needing a follow-up ADR._
