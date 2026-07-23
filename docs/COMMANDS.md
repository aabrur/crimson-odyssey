# Command Reference

## Core

```text
crimson
crimson setup
crimson doctor [--json] [--live]
crimson fix
crimson status [--json]
crimson run <prompt>
crimson models [provider] [--refresh]
```

## Loadout

```text
crimson loadout list
crimson loadout preview
crimson loadout install <directory>
crimson loadout validate [skill-id]
crimson loadout equip <skill-id> <slot>
crimson loadout unequip <skill-id> <slot>
```

## Gateways

```text
crimson gateway add <telegram|discord>
crimson gateway list
crimson gateway doctor <id>
crimson gateway bind <id>
crimson gateway start <id>
```

## Soul and Identity

```text
crimson soul show
crimson soul set <key> <value>
crimson soul rollback [revision-index]
crimson identity show
crimson identity set <key> <value>
crimson identity rollback [revision-index]
```

## Sessions

```text
crimson session list
crimson session new
crimson session archive <id>
crimson session prune [days]
```
