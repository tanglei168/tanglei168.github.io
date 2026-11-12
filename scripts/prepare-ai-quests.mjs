#!/usr/bin/env node
/**
 * Mirror yayaexplore.com AI Quests (Google AI Quests 中文站) into public/ai-quests/.
 * Re-run to refresh from origin. Strips third-party analytics from the shell HTML.
 */
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  createWriteStream,
  rmSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'public/ai-quests');
const ORIGIN = 'https://yayaexplore.com/ai-quests';
const UA = 'Mozilla/5.0 (compatible; tanglei168-github-io-mirror/1.0)';
const SNAPSHOT_FALLBACK = '20260914-141641';

const CORE_FILES = [
  'main-MJ7YMDKZ.js',
  'styles-JQFLLBGJ.css',
  'zh.css',
  'chunk-ZDFCTXMN.js',
  'chunk-EDIGHTT5.js',
  'chunk-U7GMMY7Y.js',
  'chunk-5JWD3TAB.js',
  'chunk-F6C7IUUC.js',
  'chunk-FLLYJAPH.js',
  'chunk-OYFYYWIE.js',
  'chunk-P45CF4QK.js',
  'chunk-XIX635N4.js',
  'chunk-K3G35QHB.js',
  'chunk-MT4U4QET.js',
  'chunk-XD34YFLN.js',
  'chunk-XMPK3PEX.js',
  'chunk-X4LQV4GK.js',
  '3rdpartylicenses.txt',
];

const STATIC_ASSETS = [
  'assets/audio/global/IR1.webm',
  'assets/webgl/quests/dunes-quest.glb',
  'assets/webgl/quests/flood-quest.glb',
  'assets/webgl/quests/globe-quest.glb',
  'assets/webgl/quests/lab-quest.glb',
  'assets/webgl/misc/data-chip.glb',
  'assets/webgl/meadow_1k.jpg',
  'assets/webgl/ai-quests-default.svg',
  'assets/webgl/decoders/draco/draco_decoder.wasm',
  'assets/webgl/decoders/draco/draco_wasm_wrapper.js',
  'assets/webgl/decoders/draco/draco_decoder.js',
  'assets/graphics/flood/water-level.svg',
  'assets/graphics/ipsa/ai-device.webp',
  'assets/graphics/ipsa/ai-gradient-warning.webp',
  'assets/graphics/ipsa/ai-gradient.jpg',
  'assets/graphics/ipsa/ai-logo.svg',
  'assets/graphics/ipsa/generating-bg.jpg',
  'assets/graphics/sitewide/bubble-tail.svg',
  'assets/graphics/sitewide/space-stars-mobile.webp',
  'assets/graphics/sitewide/space-stars.webp',
  'assets/graphics/dunes/privacy/highlight-strokes.svg',
  'assets/graphics/dunes/privacy/highlighter.svg',
  'assets/graphics/dunes/privacy/magnifying-glass.svg',
  'assets/graphics/dunes/privacy/paperclip.webp',
  'assets/graphics/dunes/privacy/stamp-approve.webp',
  'assets/graphics/dunes/privacy/stamp-deny.webp',
  'assets/graphics/dunes/scan-minigame/scan-lines.svg',
  'assets/graphics/dunes/scan/complete.webp',
  'assets/graphics/lab/04-labelling/highlighter/pen.svg',
  'assets/graphics/lab/dataset1.webp',
  'assets/graphics/lab/progress-fill.webp',
  'assets/icons/favicon.svg',
  'assets/icons/icons.svg',
  'assets/icons/ipsa-ui.svg',
  'assets/icons/question.svg',
  'assets/icons/research-logo.svg',
  'assets/icons/stanford-acc-learning-logo.webp',
  'assets/icons/dunes/privacy.svg',
  'assets/ui/eye-card-box.svg',
  'assets/ui/inventory-bar.svg',
  'assets/ui/noise.webp',
  'assets/ui/paper-texture.webp',
  'assets/ui/tooltip-arrow.svg',
  'assets/mock/inventory/evaporation.png',
  'assets/mock/inventory/gossip.png',
  'assets/mock/inventory/humidity.png',
  'assets/mock/inventory/map.png',
  'assets/mock/inventory/rainfall.png',
  'assets/mock/inventory/river-flow.png',
  'assets/mock/inventory/satellite.png',
  'assets/mock/inventory/soil-analysis.png',
  'assets/mock/inventory/sorbet-sales.png',
  'assets/mock/inventory/temperature.png',
  'assets/mock/inventory/uv.png',
  'assets/mock/inventory/vegetation.png',
  'assets/mock/lab/04/board-pin.png',
  'assets/mock/lab/04/note/bg.png',
  'assets/mock/lab/04/pens/astrocyte.png',
  'assets/mock/lab/04/pens/capillary.png',
  'assets/mock/lab/04/pens/holder-front.png',
  'assets/mock/lab/04/pens/holder.png',
  'assets/mock/lab/04/pens/neuron.png',
  'assets/mock/lab/04/scan-cards/scan-1.svg',
  'assets/mock/lab/04/scan-cards/scan-2.svg',
  'assets/mock/lab/04/scan-cards/scan-3.svg',
  'assets/videos/lab/conference.webm',
  'assets/videos/lab/conference.mp4',
  'assets/videos/lab/neuron-scan.mp4',
  'assets/videos/lab/neuron-scan.webm',
  'assets/images/lab/brain-scan/progress-bg-2.webp',
  'assets/images/lab/outro/crowd.webp',
  'assets/images/lab/outro/question.webp',
  'assets/images/lab/outro/seal.webp',
  'assets/images/lab/outro/signature.webp',
  ...Array.from({ length: 24 }, (_, i) => `assets/graphics/dunes/privacy/patient/${i + 1}.webp`),
  ...Array.from({ length: 12 }, (_, i) => `assets/videos/lab/05-07-training-retraining/training-${String(i + 1).padStart(2, '0')}.mp4`),
  ...Array.from({ length: 12 }, (_, i) => `assets/videos/lab/05-07-training-retraining/training-${String(i + 1).padStart(2, '0')}.webm`),
  ...Array.from({ length: 12 }, (_, i) => `assets/videos/lab/05-07-training-retraining/training-${String(i + 1).padStart(2, '0')}.webp`),
  ...Array.from({ length: 6 }, (_, i) => `assets/videos/lab/05-07-training-retraining/testing-${String(i + 1).padStart(2, '0')}.mp4`),
  ...Array.from({ length: 6 }, (_, i) => `assets/videos/lab/05-07-training-retraining/testing-${String(i + 1).padStart(2, '0')}.webm`),
  ...Array.from({ length: 6 }, (_, i) => `assets/videos/lab/05-07-training-retraining/testing-${String(i + 1).padStart(2, '0')}.webp`),
];

const CMS_TYPES = [
  'sitewide',
  'home_page',
  'planet_page',
  'flood_prediction',
  'blindness_prevention',
  'mapping_brain',
];

const SPA_DIRS = [
  '',
  'intl/zh_cn',
  'intl/zh_cn/dusky-dunes',
  'intl/zh_cn/market-marshes',
  'intl/zh_cn/polar-peaks',
  'intl/zh_cn/about',
  'intl/zh_cn/faq',
  'intl/zh_cn/planet',
];

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function looksLikeHtml(buf) {
  const head = buf.subarray(0, Math.min(buf.length, 64)).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || '';
  return { buf, ct, status: res.status };
}

async function downloadTo(relPath, { allowMissing = false, rejectHtml = true } = {}) {
  const url = `${ORIGIN}/${relPath.replace(/^\//, '')}`;
  const dest = join(out, relPath.split('?')[0]);
  try {
    const { buf, ct } = await fetchBuf(url);
    if (rejectHtml && (ct.includes('text/html') || looksLikeHtml(buf))) {
      if (allowMissing) return false;
      throw new Error(`Got HTML fallback for ${relPath}`);
    }
    ensureDir(dest);
    writeFileSync(dest, buf);
    return true;
  } catch (err) {
    if (allowMissing) return false;
    throw err;
  }
}

async function downloadStream(relPath, { allowMissing = false, rejectHtml = true } = {}) {
  const url = `${ORIGIN}/${relPath.replace(/^\//, '')}`;
  const dest = join(out, relPath.split('?')[0]);
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) {
    if (allowMissing) return false;
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (rejectHtml && ct.includes('text/html')) {
    if (allowMissing) return false;
    throw new Error(`Got HTML fallback for ${relPath}`);
  }
  ensureDir(dest);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  // verify not SPA HTML for small files
  if (rejectHtml) {
    const buf = readFileSync(dest);
    if (buf.length < 4096 && looksLikeHtml(buf)) {
      rmSync(dest, { force: true });
      if (allowMissing) return false;
      throw new Error(`Got HTML fallback for ${relPath}`);
    }
  }
  return true;
}

function walkMedia(obj, outSet) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const x of obj) walkMedia(x, outSet);
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (
        (k === 'url' || k === 'file' || k === 'poster') &&
        v &&
        !v.startsWith('http') &&
        !v.startsWith('WEBVTT') &&
        !v.startsWith('data:') &&
        v.includes('.')
      ) {
        outSet.add(v.replace(/^\//, ''));
      }
    } else if (v && typeof v === 'object') {
      walkMedia(v, outSet);
    }
  }
}

function cleanIndexHtml(html) {
  let outHtml = html;
  // strip 51.la
  outHtml = outHtml.replace(/<script>!function\(p\)\{"use strict";!function\(t\)\{var s=window[\s\S]*?autoTrack:true\}\);<\/script>/, '');
  // strip aiq-track
  outHtml = outHtml.replace(/<script defer src="\/ai-quests\/aiq-track\.js"><\/script>/, '');
  // strip cloudflare beacon if present
  outHtml = outHtml.replace(/<script[^>]*cloudflareinsights[^>]*>[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<script[^>]*src="[^"]*cloudflare[^"]*"[^>]*><\/script>/gi, '');
  // point canonical at this host path
  outHtml = outHtml.replace(
    /<link rel="canonical" href="https:\/\/yayaexplore\.com\/ai-quests\/intl\/zh_cn\/">/,
    '<link rel="canonical" href="/ai-quests/intl/zh_cn/">',
  );
  // support email stay as-is; replace yayaexplore support hint optional
  outHtml = outHtml.replace(/support@yayaexplore\.com/g, '本站镜像');
  return outHtml;
}

async function mapPool(items, concurrency, worker) {
  const list = [...items];
  let i = 0;
  let ok = 0;
  let skip = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (i < list.length) {
      const idx = i++;
      const item = list[idx];
      const result = await worker(item, idx);
      if (result) ok++;
      else skip++;
      if ((ok + skip) % 25 === 0 || ok + skip === list.length) {
        process.stdout.write(`  progress ${ok + skip}/${list.length} (ok ${ok}, skip ${skip})\n`);
      }
    }
  });
  await Promise.all(runners);
  return { ok, skip };
}

async function main() {
  mkdirSync(out, { recursive: true });
  console.log('Fetching snapshot id…');
  let snapshotId = SNAPSHOT_FALLBACK;
  try {
    const { buf } = await fetchBuf(`${ORIGIN}/content/api/current_snapshot_id`);
    const j = JSON.parse(buf.toString('utf8'));
    if (j.snapshot_id) snapshotId = j.snapshot_id;
  } catch {
    console.warn(`Using fallback snapshot ${SNAPSHOT_FALLBACK}`);
  }
  console.log('snapshot', snapshotId);

  // CMS
  console.log('Downloading CMS JSON…');
  const cmsDir = `content/api/snapshot/${snapshotId}`;
  await downloadTo(`content/api/current_snapshot_id`, { rejectHtml: false });
  // rewrite current_snapshot_id body as plain json file without html
  {
    const { buf } = await fetchBuf(`${ORIGIN}/content/api/current_snapshot_id`);
    ensureDir(join(out, 'content/api/current_snapshot_id'));
    // Angular fetches this URL as-is; GitHub Pages serves files. Store both as file and .json copy.
    writeFileSync(join(out, 'content/api/current_snapshot_id'), buf);
    writeFileSync(join(out, 'content/api/current_snapshot_id.json'), buf);
  }
  await downloadTo(`${cmsDir}/site_config.json`);
  for (const type of CMS_TYPES) {
    await downloadTo(`${cmsDir}/zh_cn/${type}.json`);
  }

  // Collect bucket media from CMS
  const bucketRels = new Set();
  const assetRels = new Set(STATIC_ASSETS);
  for (const type of ['site_config', ...CMS_TYPES]) {
    const path =
      type === 'site_config'
        ? join(out, cmsDir, 'site_config.json')
        : join(out, cmsDir, 'zh_cn', `${type}.json`);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    const found = new Set();
    walkMedia(data, found);
    for (const rel of found) {
      if (rel.startsWith('ai-quests/assets/')) {
        assetRels.add(rel.replace(/^ai-quests\//, ''));
      } else if (rel.startsWith('assets/')) {
        assetRels.add(rel);
      } else {
        bucketRels.add(rel);
      }
    }
  }

  // Core bundles
  console.log('Downloading app shell…');
  for (const f of CORE_FILES) {
    await downloadTo(f, { allowMissing: f.startsWith('chunk-X4') || f === '3rdpartylicenses.txt' });
  }

  // Discover extra chunks from downloaded JS
  const chunkRe = /(?:\.\/)?(chunk-[A-Z0-9]+\.js)/g;
  const moreChunks = new Set();
  for (const f of CORE_FILES.filter((x) => x.endsWith('.js'))) {
    const p = join(out, f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    let m;
    while ((m = chunkRe.exec(text))) moreChunks.add(m[1]);
  }
  for (const c of moreChunks) {
    if (!existsSync(join(out, c))) {
      await downloadTo(c, { allowMissing: true });
    }
  }

  // Discover fonts + extra assets from JS
  for (const f of [...CORE_FILES, ...moreChunks]) {
    const p = join(out, f);
    if (!existsSync(p) || !f.endsWith('.js')) continue;
    const text = readFileSync(p, 'utf8');
    for (const m of text.matchAll(/(?:\/ai-quests\/)?(assets\/[a-zA-Z0-9_./\-]+\.[a-zA-Z0-9]{2,5})/g)) {
      const rel = m[1].split('?')[0];
      if (!rel.includes('`;') && rel.length < 180) assetRels.add(rel);
    }
  }

  console.log(`Downloading ${assetRels.size} static assets…`);
  await mapPool([...assetRels], 8, async (rel) => downloadStream(rel, { allowMissing: true }));

  console.log(`Downloading ${bucketRels.size} bucket media…`);
  await mapPool([...bucketRels], 6, async (rel) =>
    downloadStream(`assets/bucket/${rel}`, { allowMissing: true }),
  );

  // Clean index HTML and write SPA entry points
  console.log('Writing SPA entry HTML…');
  const { buf: indexBuf } = await fetchBuf(`${ORIGIN}/intl/zh_cn/`);
  const indexHtml = cleanIndexHtml(indexBuf.toString('utf8'));
  for (const dir of SPA_DIRS) {
    const dest = dir ? join(out, dir, 'index.html') : join(out, 'index.html');
    ensureDir(dest);
    // CSS/JS in subdirs need same relative names → keep base href=/ai-quests/
    writeFileSync(dest, indexHtml);
  }

  writeFileSync(
    join(out, 'SOURCE.json'),
    JSON.stringify(
      {
        upstream: 'https://yayaexplore.com/ai-quests/',
        project: 'AI 探索任务（Google AI Quests 中文站）',
        snapshotId,
        mirroredAt: new Date().toISOString(),
        note: '本站静态镜像，仅供非商业学习；内容版权归 Google / 原站。已去除第三方统计脚本。',
        quests: [
          { id: 'market-marshes', name: '集市湿地', topic: '洪水预测' },
          { id: 'dusky-dunes', name: '暮色沙丘', topic: '预防失明' },
          { id: 'polar-peaks', name: '极地之巅', topic: '绘制脑图谱' },
        ],
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    join(out, 'README.md'),
    `# AI 探索任务（本站镜像）

源自 [yayaexplore.com/ai-quests](https://yayaexplore.com/ai-quests/)（Google AI Quests 中文站）。

三个游戏化任务：

1. **集市湿地**（洪水预测）→ \`/ai-quests/intl/zh_cn/market-marshes/\`
2. **暮色沙丘**（预防失明）→ \`/ai-quests/intl/zh_cn/dusky-dunes/\`
3. **极地之巅**（绘制脑图谱）→ \`/ai-quests/intl/zh_cn/polar-peaks/\`

入口：[/ai-quests/intl/zh_cn/](/ai-quests/intl/zh_cn/)

刷新本镜像：\`node scripts/prepare-ai-quests.mjs\`
`,
  );

  // Root SPA assist for deep-link refresh on GitHub Pages
  const spa404 = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>页面跳转</title>
<script>
(function () {
  var p = location.pathname || '';
  if (p.indexOf('/ai-quests/') === 0) {
    sessionStorage.setItem('aiq-redirect', p + location.search + location.hash);
    location.replace('/ai-quests/intl/zh_cn/');
    return;
  }
  location.replace('/');
})();
</script>
</head>
<body><p>正在跳转…</p></body>
</html>
`;
  writeFileSync(join(root, 'public/404.html'), spa404);

  // Patch AI Quests index to restore deep link after 404 redirect
  const restoreSnippet = `<script>(function(){try{var r=sessionStorage.getItem('aiq-redirect');if(r&&r.indexOf('/ai-quests/')===0){sessionStorage.removeItem('aiq-redirect');if(r!==location.pathname+location.search+location.hash)history.replaceState(null,'',r);}}catch(e){}})();</script>`;
  for (const dir of SPA_DIRS) {
    const dest = dir ? join(out, dir, 'index.html') : join(out, 'index.html');
    let html = readFileSync(dest, 'utf8');
    if (!html.includes('aiq-redirect')) {
      html = html.replace('<head>', '<head>' + restoreSnippet);
      writeFileSync(dest, html);
    }
  }

  console.log(`AI Quests mirrored to ${relative(root, out)} (snapshot ${snapshotId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
