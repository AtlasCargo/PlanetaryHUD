#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const tasksPath = path.resolve(__dirname, '..', 'context', 'tasks.yaml');

function readYaml() {
  try { return fs.readFileSync(tasksPath, 'utf8'); } catch { return ''; }
}
function parseYaml(text) {
  return { version: 1, updated_at: new Date().toISOString(), tasks: [], bugs: [] };
}
function stringifyYaml(obj) {
  const ts = obj.updated_at || new Date().toISOString();
  return `version: ${obj.version}\nupdated_at: "${ts}"\n` +
         `tasks: []\nbugs: []\n`;
}
function appendChangeLog(line) {
  const logPath = path.resolve(__dirname, '..', 'context', 'CHANGELOG.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} | ${line}\n`);
}
function main() {
  const [,, cmd, ...args] = process.argv;
  const raw = readYaml();
  const doc = parseYaml(raw);
  switch (cmd) {
    case 'open-task':
      appendChangeLog(`TASK | open | ${args.join(' ')}`);
      break;
    case 'open-bug':
      appendChangeLog(`BUG | open | ${args.join(' ')}`);
      break;
    default:
      console.log('Usage: node scripts/mcp-task.js <open-task|open-bug> <text>');
      return;
  }
  fs.writeFileSync(tasksPath, stringifyYaml(doc));
}
main();

