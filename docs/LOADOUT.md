# Loadout System

## Slots

| Slot | Limit | Purpose |
|---|---:|---|
| Weapon | 1 | Main operating specialization |
| Armor | 1 | Guardrails and quality policy |
| Accessory | 2 | Lightweight contextual support |
| Magic | 2 | Specialized or expensive workflow |

## External skill format

A skill directory can contain `skill.json`:

```json
{
  "id": "repository-refactor",
  "name": "Repository Refactor",
  "version": "1.0.0",
  "slots": ["magic"],
  "description": "Plan and execute repository-wide refactors.",
  "trigger": ["refactor", "cleanup", "architecture"],
  "permissions": ["filesystem", "process"],
  "contextCost": "high",
  "instructions": "Inspect structure first. Produce a migration plan. Apply changes in small verified steps."
}
```

Or a `SKILL.md` file:

```markdown
---
id: repository-refactor
name: Repository Refactor
version: 1.0.0
slots: magic
trigger: refactor, cleanup, architecture
permissions: filesystem, process
contextCost: high
description: Plan and execute repository-wide refactors.
---

Inspect structure first. Produce a migration plan. Apply changes in small verified steps.
```

Install and equip:

```bash
crimson loadout install ./repository-refactor
crimson loadout validate repository-refactor
crimson loadout equip repository-refactor magic
```

Installed skill content is copied into `.crimson/odyssey/skills/`.
