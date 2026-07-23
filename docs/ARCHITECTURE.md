# Crimson Odyssey Architecture

## Runtime flow

```text
CLI or TUI or Gateway
        |
        v
Unified Agent Turn
        |
        +-- Workspace state
        +-- Soul and Identity
        +-- Session history
        +-- Relevant memory
        +-- Loadout context router
        +-- Model provider client
        |
        v
Verified response and persisted heartbeat
```

Every interaction uses the same agent runtime. The TUI, one-shot CLI, Telegram, and Discord only provide platform adapters.

## Project-local state

The active workspace owns `.crimson/odyssey/`. This prevents unrelated projects from sharing sessions, memory, Loadouts, or Identity overrides by accident.

Global state under `~/.crimson` is limited to credentials, vault material, and shared cache data that should not be committed to a project.

## Loadout context lifecycle

The first turn of a session includes full instructions for every equipped item. Later turns keep Weapon and Armor active, then inject Accessories and Magic only when their trigger terms match the current task.

This design keeps the operating contract stable while reducing repeated context cost.

## Provider isolation

Provider-specific request formats live in `src/providers/client.js`. Provider metadata and live model discovery live in `src/providers/catalog.js`. TUI and CLI pickers do not call provider APIs directly.

No model fallback is automatic. A failure is shown to the user and recorded in heartbeat state.

## Gateway isolation

Telegram and Discord normalize messages into a platform-neutral agent turn. Each remote conversation maps to a separate persisted session. Remote access is rejected unless the author UID matches the configured owner and pairing has completed.
