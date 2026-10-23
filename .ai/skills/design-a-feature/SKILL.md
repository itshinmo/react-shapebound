---
name: design-a-feature
description: Use when a feature needs UI — a screen, component, interaction, visual state, or layout change. Produces a UI brief grounded in the existing Tailwind design system and checks accessibility and token conformance.
---

# design-a-feature

## Prerequisites

- `docs/design-system.md` — palette, type, spacing, motion, Tailwind conventions.
- `docs/components.md` — existing primitives and ownership.
- `src/styles/global.css` — the only source of theme tokens and custom utilities.
- `AGENTS.md` — design non-negotiables and the approval gate.

## Workflow

1. State the user job and the single primary action on the screen.
2. Inventory what already exists. Reuse a primitive before proposing a new one.
3. Define hierarchy: what the eye sees first, second, third. Use type scale and spacing, not color
   alone.
4. Define layout at mobile and desktop widths, including the smallest supported viewport.
5. Define every state: default, hover, focus-visible, active, disabled, empty, loading, error,
   success, and reduced motion.
6. Specify the exact tokens/utilities. If a new token is needed, justify it against the existing
   palette and say why the current tokens are insufficient.
7. Specify accessibility: semantic element, keyboard path, focus order, labels, live regions,
   contrast, motion.
8. Write the brief's non-goals. Do not let the implementation absorb adjacent screens.
9. Hand the brief to `implementer`; review the result against the conformance checklist.

## Constraints

- **No canvas/WebGL.** DOM-only is architectural (ADR-002).
- **No raw hex/rgb, no new accent, no new typeface** without an RFC or explicit author decision.
- **No CSS Modules or CSS-in-JS.** Tailwind utilities + semantic theme tokens only.
- **No business logic or gameplay rules.** Ask `game-designer` for rule-dependent states.
- **No effects that harm contrast, focus, or motion accessibility.**
- **No invented copy that implies gameplay that does not exist.** The play screen is a movement
  slice; label it as such and do not imply combat, bosses, points, or a skill tree.

## Output contract

Append or write a brief with exactly these sections:

```md
## UI brief — <feature name>

- **Objective:** the user job and primary action
- **Hierarchy:** first / second / third
- **Layout:** mobile and desktop structure
- **States:** default, hover, focus, active, disabled, empty, loading, error, reduced motion
- **Motion:** what moves, why, and its reduced-motion behavior
- **Accessibility:** semantics, keyboard path, labels, contrast, live regions
- **Tokens/utilities:** exact classes or theme tokens; justify any extension
- **Non-goals:** what this deliberately does not cover
```

## Conformance checklist

- [ ] Uses semantic HTML and existing primitives.
- [ ] Every interactive element is keyboard reachable with a visible focus state.
- [ ] Color contrast holds for text, borders, and focus rings.
- [ ] Reduced motion is respected both by system preference and the in-app setting.
- [ ] No raw palette values, no CSS Modules, no canvas.
- [ ] Empty/error/disabled states are designed, not improvised.
- [ ] `docs/components.md` updated if the primitive inventory changed.

## References

- `docs/design-system.md`, `docs/components.md`, `docs/architecture.md#routing`.
- `.ai/agents/designer.md`, `.ai/agents/implementer.md`.
