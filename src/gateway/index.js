import { doctorTelegram, runTelegramGateway } from './telegram.js';
import { doctorDiscord, runDiscordGateway } from './discord.js';
import { loadGatewayConfig } from './common.js';

export function gatewayAdapter(type) {
  if (type === 'telegram') return { doctor: doctorTelegram, run: runTelegramGateway };
  if (type === 'discord') return { doctor: doctorDiscord, run: runDiscordGateway };
  throw new Error(`Unsupported gateway type: ${type}`);
}

export async function doctorGateway(paths, id, options = {}) {
  const config = loadGatewayConfig(paths, id);
  if (!config) throw new Error(`Gateway not found: ${id}`);
  return gatewayAdapter(config.type).doctor(config, options);
}

export async function runGateway(paths, id, options = {}) {
  const config = loadGatewayConfig(paths, id);
  if (!config) throw new Error(`Gateway not found: ${id}`);
  return gatewayAdapter(config.type).run({ paths, config, ...options });
}
