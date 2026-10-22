---
name: <role>
description: Use when <role applies>. <what it produces in one or two sentences.>
mode: all # all | primary | subagent
# Optional, for read-only roles. The last matching rule wins.
# permissions:
#   - action: edit
#     resource: "*"
#     effect: deny
---

# <Role>

## Responsibilities

- <what this role owns>

## Boundaries

- **Never** <the expensive mistake>.
- <what to do instead>

## Applicable skills

- `.ai/skills/<name>/SKILL.md`

## When invoked and handoff

**Input:** <artifact>.
**Handoff:** <next role> with <named artifact>.

## Expected outputs

- <named artifact>

## References

- `AGENTS.md`
- `docs/<file>.md`
