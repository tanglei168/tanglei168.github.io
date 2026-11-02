import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/world-history');
const manifest = JSON.parse(await readFile(path.join(output, 'snapshots.json'), 'utf8'));
const base = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/' + manifest.commit + '/';
await mkdir(path.join(output, 'data'), {recursive: true});
await mkdir(path.join(output, 'vendor'), {recursive: true});
async function download(url, filename, sha) {
  let bytes;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(60000)});
      if (!response.ok) throw new Error(response.status + ' ' + url);
      bytes = Buffer.from(await response.arrayBuffer());
      if (sha) {
        const hash = createHash('sha1').update('blob ' + bytes.length).update(Buffer.from([0])).update(bytes).digest('hex');
        if (hash !== sha) throw new Error('Upstream integrity mismatch: ' + filename);
      }
      break;
    } catch (error) { if (attempt === 2) throw error; }
  }
  if (filename.endsWith('.geojson')) {
    const geo = JSON.parse(bytes.toString());
    if (geo.type !== 'FeatureCollection' || !geo.features?.length) throw new Error('Invalid map: ' + filename);
    // Preserve source data and accuracy; remove only insignificant JSON whitespace.
    bytes = Buffer.from(JSON.stringify(geo));
  }
  await writeFile(filename, bytes);
}
const queue = [...manifest.snapshots];
await Promise.all(Array.from({length: 4}, async () => {
  while (queue.length) {
    const item = queue.shift();
    await download(base + 'geojson/' + item.filename, path.join(output, 'data', item.filename), item.sha);
    console.log('World history: ' + item.year);
  }
}));
await download(base + 'LICENSE', path.join(output, 'DATA-LICENSE.txt'));
await download(base + 'README.md', path.join(output, 'DATA-README.md'));
await download('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', path.join(output, 'vendor/d3.min.js'));
await download('https://cdn.jsdelivr.net/npm/d3@7.9.0/LICENSE', path.join(output, 'vendor/D3-LICENSE.txt'));
console.log('Prepared ' + manifest.snapshots.length + ' global historical snapshots.');
