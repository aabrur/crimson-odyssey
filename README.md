# Crimson Odyssey

**Equip your agent. Enter the rift.**

Crimson Odyssey is a multilingual, loadout-driven AI agent for the terminal by Crimson Rift Studio. Version 0.2.0 introduces an adaptive TUI, project-local Soul and Identity, selective Loadout context, multi-provider model routing, persistent sessions, and owner-only Telegram and Discord gateways.

## Requirements

- Node.js 22 or newer
- A terminal with ANSI support
- A model provider API key, or a local Ollama or LM Studio server

## Install

### Git clone

```bash
git clone https://github.com/aabrur/crimson-odyssey.git
cd crimson-odyssey
npm link
crimson --version
```

### npm from GitHub

```bash
npm install -g github:aabrur/crimson-odyssey
crimson --version
```

The repository is private during development. GitHub authentication must already be configured for Git or npm.

### Windows PowerShell

After cloning the repository:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
crimson --version
```

### Linux or macOS

After cloning the repository:

```bash
chmod +x install.sh
./install.sh
crimson --version
```

## Quick start

```bash
crimson setup
crimson doctor
crimson
```

`crimson` opens the adaptive TUI. In a wide terminal, a scrollable sidebar appears on the right. In a narrow terminal, the conversation uses the full width and the sidebar can be toggled with `Ctrl+B`.

The main conversation surface has no outer top frame and no outer left frame. Conversation history, activity, tool events, and logs remain scrollable without moving the composer from the bottom.

## TUI controls

| Control | Action |
|---|---|
| `PgUp` / `PgDn` | Scroll conversation history |
| Mouse wheel | Scroll the pane under the pointer |
| `Tab` | Change focus between composer, transcript, and sidebar |
| `Ctrl+B` | Toggle sidebar |
| `/model` | Open provider and model picker |
| `/loadout` | Open skill and slot picker |
| `/session` | Switch or create a session |
| `/logs` | Focus the sidebar log stream |
| `/help` | Show commands |
| `/exit` | Close Crimson Odyssey |

## Project-local state

Crimson initializes the following structure inside the active workspace:

```text
.crimson/
└── odyssey/
    ├── soul.yaml
    ├── identity.yaml
    ├── heartbeat.json
    ├── agent.yaml
    ├── workspace.yaml
    ├── config.json
    ├── model.json
    ├── memory/
    ├── sessions/
    ├── histories/
    ├── loadouts/
    ├── skills/
    ├── gateways/
    ├── logs/
    ├── cache/
    ├── revisions/
    └── state/
```

Workspace state and runtime history are ignored by Git by default.

## Loadout

Each Loadout supports:

- 1 Weapon
- 1 Armor
- 2 Accessories
- 2 Magic

Weapon and Armor remain active as the operating contract. On the first turn of a session, Crimson performs a full Loadout bootstrap. Later turns use selective context for Accessories and Magic according to task triggers.

```bash
crimson loadout list
crimson loadout preview
crimson loadout equip software-engineer weapon
crimson loadout equip deep-research magic
crimson loadout install ./my-skill
crimson loadout validate
```

External skills can use either `skill.json` or `SKILL.md`. See [docs/LOADOUT.md](docs/LOADOUT.md).

## Model providers

Initial provider support:

1. OpenAI
2. Anthropic
3. Google Gemini
4. xAI
5. Mistral
6. Groq
7. OpenRouter
8. Ollama
9. LM Studio
10. Custom OpenAI-compatible endpoint

Both `crimson setup` and `/model` use provider-first model selection. A model ID can always be entered manually. Live model catalogs are fetched when credentials and network access are available, then cached locally. Suggested model IDs are fallbacks, not availability guarantees.

## Telegram and Discord

Gateway credentials are stored through the operating-system keyring when available. The encrypted local vault is used as fallback. Tokens are never written into workspace config or logs.

```bash
crimson gateway add telegram
crimson gateway add discord
crimson gateway list
crimson gateway doctor telegram
crimson gateway bind telegram
crimson gateway start telegram
```

Each gateway is owner-only by default. After adding a gateway, Crimson generates a short pairing code. Send `/bind CODE` from the configured owner UID while the gateway is running.

Discord message handling requires the Message Content intent to be enabled in the Discord Developer Portal. The optional Server ID limits the bot to one server. Telegram uses long polling through the official Bot API.

See [docs/GATEWAYS.md](docs/GATEWAYS.md) for setup and verification.

## Soul and Identity

Soul and Identity are editable and revisioned:

```bash
crimson soul show
crimson soul set purpose "Build carefully and verify every result."
crimson soul rollback 0

crimson identity show
crimson identity set language auto
crimson identity rollback 0
```

Every edit creates a rollback snapshot inside `.crimson/odyssey/revisions/`.

## Sessions and retention

History retention defaults to 90 days and can be changed in `.crimson/odyssey/config.json`.

```bash
crimson session list
crimson session new
crimson session archive <session-id>
crimson session prune 90
```

## Security

- No raw secrets in repository files or logs
- Owner UID enforcement for remote gateways
- Pairing code with expiry
- Project-local workspace state
- ANSI control sequence sanitization
- Encrypted local secret vault fallback
- Soul and Identity revision history
- No silent model fallback

Read [docs/SECURITY.md](docs/SECURITY.md) before enabling remote gateways.

## Verification

```bash
npm run verify
npm run verify:live  # optional, requires gateway environment variables
crimson doctor --json
```

The verification gate runs syntax checks, repository policy checks, automated tests, package dry-run, and CLI smoke tests through GitHub Actions.

## License

MIT
