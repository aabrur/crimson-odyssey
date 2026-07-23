import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PROVIDERS, fetchModels } from './catalog.js';
import { setSecret } from '../core/secrets.js';
import { readJSON, writeJSON } from '../core/fs.js';
import { readSecret } from '../core/terminal.js';

export async function promptChoice(title, choices, { allowCustom = false, rl } = {}) {
  const own = !rl;
  const reader = rl || readline.createInterface({ input, output });
  try {
    output.write(`\n${title}\n\n`);
    choices.forEach((choice, index) => output.write(`${index + 1}. ${choice.label}\n`));
    if (allowCustom) output.write('0. Enter custom value\n');
    while (true) {
      const answer = (await reader.question('\nSelect: ')).trim();
      if (allowCustom && answer === '0') {
        const custom = (await reader.question('Custom value: ')).trim();
        if (custom) return { custom: true, value: custom };
      }
      const index = Number(answer) - 1;
      if (Number.isInteger(index) && choices[index]) return { custom: false, value: choices[index].value };
      output.write('Invalid selection. Try again.\n');
    }
  } finally {
    if (own) reader.close();
  }
}

export async function runModelSetup(state, { refresh = true } = {}) {
  let providerId;
  let config;
  let provider;

  const providerReader = readline.createInterface({ input, output });
  try {
    const providerPick = await promptChoice('Select provider', PROVIDERS.map((item) => ({
      label: `${item.name}${item.id === 'custom' ? ' (manual endpoint)' : ''}`,
      value: item.id
    })), { rl: providerReader });
    providerId = providerPick.value;
    provider = PROVIDERS.find((item) => item.id === providerId);
    config = readJSON(state.paths.config, state.config);
    config.providers ||= {};
    config.providers[provider.id] ||= {};
    if (provider.id === 'custom') {
      config.providers.custom.baseUrl = (await providerReader.question('Base URL, including /v1 when required: ')).trim();
    }
  } finally {
    providerReader.close();
  }

  if (provider.secretEnv && !['ollama', 'lmstudio'].includes(provider.id)) {
    const credential = await readSecret(`API key for ${provider.name}, leave blank to use ${provider.secretEnv}: `);
    if (credential) config.providers[provider.id].secretRef = setSecret(`${provider.id}-api-key`, credential);
    else config.providers[provider.id].secretRef = `env:${provider.secretEnv}`;
  }
  writeJSON(state.paths.config, config);

  const catalog = await fetchModels(provider.id, config, { paths: state.paths, refresh });
  const choices = catalog.models.map((entry) => ({
    label: `${entry.id}${entry.tags.length ? ` [${entry.tags.join(', ')}]` : ''}${entry.source === 'live' ? ' [live]' : ''}`,
    value: entry.id
  }));
  if (!choices.length) output.write('\nNo models were returned. Enter a model ID manually.\n');

  const modelReader = readline.createInterface({ input, output });
  try {
    const modelPick = await promptChoice(`Select ${provider.name} model`, choices, { allowCustom: true, rl: modelReader });
    const selected = {
      provider: provider.id,
      model: modelPick.value,
      custom: modelPick.custom,
      baseUrl: config.providers[provider.id]?.baseUrl || provider.baseUrl,
      secretRef: config.providers[provider.id]?.secretRef || (provider.secretEnv ? `env:${provider.secretEnv}` : null),
      updatedAt: new Date().toISOString()
    };
    writeJSON(state.paths.model, selected);
    output.write(`\nActive model: ${provider.name} / ${selected.model}\n`);
    return selected;
  } finally {
    modelReader.close();
  }
}
