import { loadWorkspaceState, updateHeartbeat } from '../core/state.js';
import { createModelClient } from '../providers/client.js';
import { composeLoadoutContext } from '../loadout/engine.js';
import { buildSystemPrompt } from './prompt.js';
import { appendMessage, readMessages } from '../session/session.js';
import { readJSON } from '../core/fs.js';

function relevantMemory(paths, text, limit = 5) {
  const index = readJSON(`${paths.memory}/index.json`, { items: [] });
  const words = new Set(String(text || '').toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  return (index.items || [])
    .map((item) => ({ item, score: String(item.text || '').toLowerCase().split(/\W+/).filter((word) => words.has(word)).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => `- ${entry.item.text}`)
    .join('\n');
}

export async function runAgentTurn({ workspace = process.cwd(), session, text, onActivity, fetchImpl = fetch }) {
  const state = loadWorkspaceState(workspace);
  const log = (event, detail = {}) => onActivity?.({ time: new Date().toISOString(), event, detail });
  updateHeartbeat(state.paths, { status: 'active', currentTask: text.slice(0, 160), currentStage: 'context', health: 'healthy' });
  appendMessage(state.paths, session, { role: 'user', content: text });
  log('context.load', { session: session.id });

  const loadout = composeLoadoutContext({
    paths: state.paths,
    loadoutName: state.workspace.loadout || 'default',
    text,
    turnIndex: Math.max(0, (session.turnCount || 1) - 1)
  });
  const memory = relevantMemory(state.paths, text);
  const system = buildSystemPrompt({ ...state, loadoutContext: loadout.context, memory });
  const history = readMessages(state.paths, session.id, { limit: 30 })
    .filter((item) => item.kind === 'message' && ['user', 'assistant'].includes(item.role))
    .slice(0, -1)
    .map((item) => ({ role: item.role, content: item.content }));
  history.push({ role: 'user', content: text });

  updateHeartbeat(state.paths, { currentStage: 'model', status: 'active' });
  log('model.request', { provider: state.model.provider, model: state.model.model, loadout: loadout.active.map((item) => item.id) });
  try {
    const client = createModelClient(state.model, state.config, { fetchImpl });
    const result = await client.send({ system, messages: history });
    const answer = result.text || '(The model returned an empty response.)';
    appendMessage(state.paths, session, { role: 'assistant', content: answer, metadata: { usage: result.usage, model: state.model } });
    updateHeartbeat(state.paths, { status: 'idle', currentStage: 'complete', lastCheckpoint: new Date().toISOString(), currentTask: null });
    log('model.response', { characters: answer.length, usage: result.usage || null });
    state.heartbeat = readJSON(state.paths.heartbeat, state.heartbeat);
    return { answer, usage: result.usage, loadout, state };
  } catch (error) {
    appendMessage(state.paths, session, { role: 'system', kind: 'error', content: error.message });
    updateHeartbeat(state.paths, { status: 'error', currentStage: 'failed', health: 'degraded', lastCheckpoint: new Date().toISOString() });
    log('model.error', { message: error.message });
    throw error;
  }
}
