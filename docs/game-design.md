# Game design

> **Status: not designed yet.** This is a skeleton for the author and the `design-a-mechanic`
> pipeline. Do not fill it with invented mechanics. Replace the `TODO` markers when the game is
> described.

## Design pillars

_What should every mechanic reinforce? Three to five short principles._

- <!-- TODO: pillar 1 -->
- <!-- TODO: pillar 2 -->
- <!-- TODO: pillar 3 -->

## Core loop

_What does the player do moment to moment, and why does it repeat?_

<!-- TODO -->

## Mechanics

| Mechanic   | Status | Spec | Docs |
| ---------- | ------ | ---- | ---- |
| _None yet_ | —      | —    | —    |

When a mechanic lands:

1. Run `.ai/skills/design-a-mechanic/SKILL.md`.
2. Add a row here with a one-paragraph current-state summary.
3. Link its spec until promotion; remove the spec after the rules are folded in.
4. Record any hard-to-reverse choice as an ADR.

## Content model

_Levels, puzzles, runs, cards, maps, or whatever the game is made of. Include the data shape and how
content is authored/validated._

<!-- TODO -->

## Balance philosophy

- No fake precision. A value that has not been playtested is tagged `[unverified]`.
- Prefer a small number of legible values over a spreadsheet of hidden modifiers.
- Every random outcome must be reproducible from the saved seed and draw order.
- Balance changes need a playtest hypothesis, not just a feeling.

## Input and accessibility

- The DOM-only constraint is architectural (ADR-002); design mechanics that read well as elements,
  text, grids, and CSS transitions.
- Every action must have a keyboard path. No drag-only or hover-only mechanics.
- Reduced motion must not remove information.
- Do not rely on color alone to distinguish shapes, states, or players.

## Open questions for the author

- What is the core loop?
- Is the game turn-based, real-time, or puzzle-like?
- What is the win/lose condition, if any?
- Is there randomness? If not, do we still need the seeded RNG for tests?
- What is the smallest playable slice we can build first?
- What should the player see on the board, and how large is it?
