import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export async function readSecret(prompt) {
  if (!stdin.isTTY) {
    const reader = readline.createInterface({ input: stdin, output: stdout });
    try { return (await reader.question(prompt)).trim(); }
    finally { reader.close(); }
  }
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  let value = '';
  return new Promise((resolve) => {
    function finish(result) {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
      resolve(result);
    }
    function onData(chunk) {
      const text = String(chunk);
      if (text === '\u0003') return finish('');
      if (text === '\r' || text === '\n') return finish(value.trim());
      if (text === '\x7f' || text === '\b') {
        value = [...value].slice(0, -1).join('');
        return;
      }
      if (/^[\x20-\x7E]+$/.test(text)) value += text;
    }
    stdin.on('data', onData);
  });
}
