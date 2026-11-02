import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'vendor/jiangshan-map');
const output = path.join(root, 'public/jiangshan-map');

// Checkout the exact gitlink recorded by this website, never a moving branch.
execFileSync('git', ['submodule', 'update', '--init', '--', 'vendor/jiangshan-map'], {
  cwd: root, stdio: 'inherit',
});
if (!existsSync(path.join(source, 'index.html'))) throw new Error('Jiangshan Atlas is missing');
mkdirSync(output, { recursive: true });
for (const entry of ['assets', 'css', 'js', 'topics', 'index.html', 'manifest.webmanifest', 'LICENSE', 'README.md', 'README_ZH.md', 'llms.txt']) {
  cpSync(path.join(source, entry), path.join(output, entry), { recursive: true });
}
// Keep share links, topic links and metadata on this site's own atlas.
function localize(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) localize(file);
    else if (/\.(html|js|css|webmanifest|txt)$/.test(entry.name)) {
      const original = readFileSync(file, 'utf8');
      const updated = original.replaceAll('https://deanchen.me/jiangshan-map', 'https://tanglei168.github.io/jiangshan-map');
      if (updated !== original) writeFileSync(file, updated);
    }
  }
}
localize(output);
console.log('Prepared Jiangshan Atlas at /jiangshan-map/');
