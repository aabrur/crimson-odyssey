#!/usr/bin/env node
import { doctorTelegram } from '../src/gateway/telegram.js';
import { doctorDiscord } from '../src/gateway/discord.js';

const results = {};
let failures = 0;

if (process.env.CRIMSON_TELEGRAM_TOKEN) {
  const result = await doctorTelegram({
    secretRef: 'env:CRIMSON_TELEGRAM_TOKEN',
    binding: { status: 'pending' }
  });
  results.telegram = result;
  if (!result.ok) failures += 1;
} else {
  results.telegram = { skipped: true, reason: 'CRIMSON_TELEGRAM_TOKEN is not set' };
}

if (process.env.CRIMSON_DISCORD_TOKEN) {
  const result = await doctorDiscord({
    secretRef: 'env:CRIMSON_DISCORD_TOKEN',
    serverId: process.env.CRIMSON_DISCORD_SERVER_ID || null,
    binding: { status: 'pending' }
  });
  results.discord = result;
  if (!result.ok) failures += 1;
} else {
  results.discord = { skipped: true, reason: 'CRIMSON_DISCORD_TOKEN is not set' };
}

console.log(JSON.stringify(results, null, 2));
process.exitCode = failures ? 1 : 0;
