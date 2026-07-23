# Crimson Odyssey v0.2.0 Verification Report

Date: 2026-07-23
Target repository: `aabrur/crimson-odyssey`
Target branch: `main`
Runtime: Node.js v22.16.0, npm 10.9.2

## Release status

The local release candidate passed source, package, TUI layout, security, Loadout, provider, session, and mocked gateway verification.

Live Telegram and Discord API checks were not executed in this build environment because external DNS resolution is unavailable. A manual GitHub Actions workflow and `npm run verify:live` are included for credential-backed verification without committing secrets.

## Automated verification

| Gate | Result |
|---|---|
| JavaScript syntax | PASS, 47 files |
| Automated tests | PASS, 46 passed, 0 failed, 0 skipped |
| No em dash policy | PASS |
| Secret pattern scan | PASS |
| Package dry-run | PASS, 44 packaged files |
| Local tarball installation | PASS |
| CLI version smoke test | PASS, 0.2.0 |
| CLI status smoke test | PASS |
| TUI size matrix | PASS, 80x24 through 200x60 |
| No outer top or left TUI frame | PASS |
| Independent sidebar scroll | PASS |
| Loadout slot limits | PASS |
| Full first-turn bootstrap | PASS |
| Selective later-turn context | PASS |
| External SKILL.md installation | PASS |
| Soul and Identity rollback | PASS |
| Encrypted vault round trip | PASS |
| Log token redaction | PASS |
| Telegram mock doctor | PASS |
| Discord mock doctor and server restriction | PASS |
| Owner pairing and authorization | PASS |

## Commands executed

```bash
npm run check
npm test
npm pack --dry-run
npm pack
npm install --prefix <temporary-prefix> ./crimson-odyssey-0.2.0.tgz
<temporary-prefix>/node_modules/.bin/crimson --version
crimson status --json
```

## Package evidence

- Package: `crimson-odyssey-0.2.0.tgz`
- SHA-256: `dd57883c653b252142d974e6204ae59d871cebcbe72079753d693905f4df3a91`
- Package size: approximately 38.7 kB
- Unpacked size: approximately 131.9 kB
- Runtime dependencies: none

## Live verification path

Set these repository secrets before running the manual `Live Gateway Verification` workflow:

- `CRIMSON_TELEGRAM_TOKEN`
- `CRIMSON_DISCORD_TOKEN`
- `CRIMSON_DISCORD_SERVER_ID`, optional

Equivalent local command:

```bash
CRIMSON_TELEGRAM_TOKEN="..." \
CRIMSON_DISCORD_TOKEN="..." \
CRIMSON_DISCORD_SERVER_ID="..." \
npm run verify:live
```

The command returns bot identity and server metadata only. Token values are never printed.

## Known verification boundary

A real incoming Telegram message, Discord Gateway connection, owner `/bind` message, and model-backed reply require an environment with external network access. The code paths are covered by unit and integration mocks, but live success must be confirmed through the included workflow or a local machine.
