import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
let count = 0;
function check(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (['node_modules', 'test-results', 'playwright-report', '.git'].includes(entry.name))
      continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) check(path);
    else if (/\.(?:mjs|js)$/.test(entry.name)) {
      execFileSync(process.execPath, ['--check', path]);
      count++;
    }
  }
}
check(fileURLToPath(root));
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
if (/https?:\/\/[^\s"']+\.(?:js|css)/.test(html))
  throw new Error('Staff portal must not load third-party scripts or styles.');
console.log(`Validated JavaScript syntax in ${count} files and local-only staff assets.`);
