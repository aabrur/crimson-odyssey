# Changelog

## 0.2.0 - Second Rift

### Added

- Adaptive TUI with no outer top or left frame
- Scroll-preserving conversation history and fixed bottom composer
- Responsive, independently scrollable right sidebar
- Inline detail strip and keyboard legends below the composer
- Shared provider-first model selection for setup and TUI
- Ten provider profiles plus custom OpenAI-compatible endpoint
- Live model catalog cache and manual model ID entry
- Project-local Soul, Identity, Heartbeat, Agent, Memory, Session, and Workspace state
- Soul and Identity revision history with rollback
- Loadout slots for Weapon, Armor, two Accessories, and two Magic
- External skill installation from `skill.json` or `SKILL.md`
- Full first-turn Loadout bootstrap with selective context after bootstrap
- Telegram long-polling gateway with owner binding
- Discord Gateway WebSocket adapter with owner and server restrictions
- Operating-system keyring support with encrypted local vault fallback
- Configurable 90-day history retention
- Cross-platform installer scripts and CI verification

### Security

- Secrets are referenced, never stored in workspace config
- Logs redact common token formats
- Remote gateway messages are rejected until owner pairing succeeds
- Discord outgoing messages disable automatic mentions
- Model output is sanitized before terminal rendering

### Compatibility

- Requires Node.js 22 or newer
