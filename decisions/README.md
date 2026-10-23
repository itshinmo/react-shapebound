# Architecture decision records

An ADR records a decision that was made, why it was made, and what it costs. It is permanent: once
accepted, an ADR is **superseded**, never rewritten.

## Conventions

- File name: `ADR-NNN-<kebab-case-title>.md`; the next free number is never reused.
- Each ADR is self-contained: a reader with only the ADR understands the decision and why.
- `Status`: `Proposed` | `Accepted` | `Superseded by ADR-NNN` | `Rejected`.
- A later decision supersedes an earlier one with a new ADR. The old one only gains the superseded
  status.
- A new **runtime** dependency needs an ADR.
- Link the RFC when one exists; use `—` when the RFC step was waived.

## When to write one

- A hard-to-reverse choice with no meaningful alternatives: new runtime dependency, rendering model,
  routing strategy, layer rule, save format.
- A decision made directly by the author (the ADR records the waiver and the options considered).
- When an RFC is accepted and shipped: write the ADR, cross-link, then archive the RFC.

A task plan belongs in a spec. A proposal with open alternatives belongs in an RFC. Current behavior
belongs in `docs/`.

## Index

| ADR                                                          | Title                                                          | Status                        | Topic                           |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| [ADR-001](ADR-001-vite-react-spa.md)                         | Vite + React SPA with hash routing                             | Accepted                      | app architecture                |
| [ADR-002](ADR-002-dom-only-rendering.md)                     | DOM-only rendering, no canvas                                  | Accepted                      | rendering                       |
| [ADR-003](ADR-003-pure-game-domain.md)                       | Pure game domain, seeded RNG, versioned local saves            | Accepted                      | game domain / persistence       |
| [ADR-004](ADR-004-agent-agnostic-knowledge-layer.md)         | Agent-agnostic knowledge layer and guardrails                  | Accepted                      | process / AI tooling            |
| [ADR-005](ADR-005-tailwind-and-local-fonts.md)               | Tailwind CSS 4, local fonts, cyberpunk-inspired design         | Accepted (refined by ADR-006) | styling / design system         |
| [ADR-006](ADR-006-cyberpunk-reference-visual-system.md)      | Align the visual system with the live Cyberpunk 2077 reference | Accepted                      | design system / visual identity |
| [ADR-007](ADR-007-landscape-only-play-surface.md)            | Landscape-only play surface and best-effort orientation lock   | Superseded by ADR-008         | play surface / platform         |
| [ADR-008](ADR-008-responsive-presentation-landscape-play.md) | Responsive presentation, landscape-only play screen            | Accepted                      | routing / orientation           |
