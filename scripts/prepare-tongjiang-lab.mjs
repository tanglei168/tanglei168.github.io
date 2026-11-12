import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'vendor/tongjiang-lab');
const output = path.join(root, 'public/k1-k12/tongjiang-lab');
const PINNED = '4d63ce0a72d987c850ec6d919e570bdb752c87a6';

// Checkout the exact gitlink recorded by this website, never a moving branch.
// Upstream smithjohn78390/tongjiang-lab may 404; .gitmodules points at a public mirror.
execFileSync('git', ['submodule', 'sync', '--', 'vendor/tongjiang-lab'], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync('git', ['submodule', 'update', '--init', '--', 'vendor/tongjiang-lab'], {
  cwd: root,
  stdio: 'inherit',
});

const head = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (head !== PINNED) {
  console.warn(`Tongjiang Lab submodule HEAD is ${head}, expected ${PINNED}. Continuing with recorded gitlink.`);
}

for (const required of ['catalog.json', 'courses', 'covers', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  if (!existsSync(path.join(source, required))) {
    throw new Error(`Tongjiang Lab is missing required path: ${required}`);
  }
}

mkdirSync(output, { recursive: true });

// Refresh generated asset trees while keeping committed catalog UI files.
for (const entry of ['courses', 'covers']) {
  const dest = path.join(output, entry);
  rmSync(dest, { recursive: true, force: true });
  cpSync(path.join(source, entry), dest, { recursive: true });
}

for (const entry of ['catalog.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.zh-CN.md']) {
  cpSync(path.join(source, entry), path.join(output, entry));
}

const catalog = JSON.parse(readFileSync(path.join(output, 'catalog.json'), 'utf8'));
if (!Array.isArray(catalog) || catalog.length === 0) {
  throw new Error('Tongjiang Lab catalog.json is empty or invalid');
}

for (const lesson of catalog) {
  const file = path.join(output, lesson.file);
  const cover = path.join(output, lesson.cover);
  if (!existsSync(file)) throw new Error(`Missing lesson file: ${lesson.file}`);
  if (!existsSync(cover)) throw new Error(`Missing cover: ${lesson.cover}`);
}

writeFileSync(
  path.join(output, 'SOURCE.json'),
  JSON.stringify(
    {
      upstream: 'https://github.com/sdvch/tongjiang-lab',
      homepage: 'https://lab.tongjiang.app',
      commit: head,
      lessonCount: catalog.length,
      license: 'CC BY-NC 4.0',
      attribution: 'Tongjiang Lab (https://lab.tongjiang.app)',
    },
    null,
    2,
  ) + '\n',
);

console.log(`Prepared Tongjiang Lab at /k1-k12/tongjiang-lab/ (${catalog.length} lessons, ${head.slice(0, 7)})`);
