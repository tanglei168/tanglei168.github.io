import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'vendor/jiangshan-map');
const output = path.join(root, 'public/china-map');

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
      const updated = original.replaceAll('https://deanchen.me/jiangshan-map', 'https://tanglei168.github.io/china-map');
      if (updated !== original) writeFileSync(file, updated);
    }
  }
}
localize(output);
// The atlas now opens in world mode; existing query-based China deep links stay valid.
const indexPath = path.join(output, 'index.html');
const worldMode = `<script>
(function () {
  const q = new URLSearchParams(location.search);
  if (!location.search || q.get('view') === 'world') {
    location.replace('/world-history/' + location.search);
  }
  document.addEventListener('DOMContentLoaded', function () {
    const heading = document.getElementById('site-heading');
    if (!heading) return;
    const link = document.createElement('a');
    link.textContent = '← 世界历史';
    const year = q.get('year');
    link.href = '/world-history/' + (year && /^-?\\d+$/.test(year) ? '?year=' + encodeURIComponent(year) : '');
    link.style.cssText = 'font:12px sans-serif;color:#9c542e;white-space:nowrap;text-decoration:none;margin-right:10px';
    heading.parentNode.insertBefore(link, heading);
  });
})();
</script>`;
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace('<head>', '<head>' + worldMode));

// Old /jiangshan-map/ links keep working by forwarding to /china-map/.
const legacy = path.join(root, 'public/jiangshan-map');
mkdirSync(legacy, { recursive: true });
writeFileSync(path.join(legacy, 'index.html'), `<!doctype html><meta charset="utf-8"><title>China Map</title>
<script>location.replace('/china-map/' + location.search + location.hash);</script>
<a href="/china-map/">China Map</a>`);

console.log('Prepared China Map at /china-map/');

