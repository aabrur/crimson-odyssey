# Messaging Gateways

## Security model

Every gateway uses:

- One owner UID
- Optional Discord Server ID restriction
- Expiring pairing code
- Separate remote conversation sessions
- Secret reference instead of raw token storage
- Redacted logs

## Telegram

```bash
crimson gateway add telegram
crimson gateway doctor telegram
crimson gateway start telegram
```

After `add`, start the gateway and send the displayed `/bind CODE` command from the configured owner account.

Telegram uses long polling. Only text messages from the bound owner are processed.

## Discord

Enable the Message Content intent for the bot in the Discord Developer Portal. Make sure the bot is installed in the configured server and can view and send messages in the intended channel.

```bash
crimson gateway add discord
crimson gateway doctor discord
crimson gateway start discord
```

Discord uses Gateway API v10 through the WebSocket implementation included in Node.js 22. Incoming messages are restricted by owner UID and, when configured, Server ID.

## Verification levels

- Configuration validation checks local schema and secret references.
- `gateway doctor` verifies the token against the official platform API.
- A full live smoke test requires running the gateway and completing owner pairing.

No live success should be claimed when only local mocks have passed.

## Optional GitHub live verification

Add repository secrets named `CRIMSON_TELEGRAM_TOKEN`, `CRIMSON_DISCORD_TOKEN`, and optionally `CRIMSON_DISCORD_SERVER_ID`, then run the `Live Gateway Verification` workflow manually. The workflow prints bot identity and server metadata but never prints token values.
