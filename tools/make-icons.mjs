/**
 * 生成 PWA 图标（public/icon-192.png、public/icon-512.png）。
 * 运行：node tools/make-icons.mjs
 *
 * 为什么不手搓 PNG：图标是渐变底 + 白蝴蝶矢量，用 Chrome 渲染一遍最准，
 * 也省得引入 sharp/resvg 这类原生依赖。
 *
 * 注意 CHROME 路径不要叠斜杠（C:////Users//... 会让进程静默失败，
 * 报错却是「连不上 CDP」）—— 这个坑在 screenshot.mjs 里踩过一次。
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Users\\22015\\.agent-browser\\browsers\\chrome-152.0.7977.64\\chrome.exe';
const PUBLIC = join(ROOT, 'public');

/**
 * 图标 HTML。
 *
 * 关键：svg 必须写死像素尺寸、并且从左上角 (0,0) 开始渲染，不能靠 flex 居中。
 * headless 模式下 --window-size 不总是生效（实测 viewport 仍是 800×600），
 * 截图只取左上角那块 —— 居中的蝴蝶正好在裁剪区外，只会得到一张纯渐变。
 * 内容贴着左上角铺固定尺寸，viewport 多大都对。
 */
const htmlFor = (size) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;overflow:hidden;background:transparent}
  svg{display:block}
</style></head>
<body>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7C3AED"/>
      <stop offset="0.46" stop-color="#A855F7"/>
      <stop offset="1" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(96,96) scale(10)">
    <path d="M16 9C13 6 6 6.5 6 12.5C6.5 16 11 15 16 12" fill="#fff" opacity=".95"/>
    <path d="M16 9C19 6 26 6.5 26 12.5C25.5 16 21 15 16 12" fill="#fff" opacity=".95"/>
    <path d="M16 13.5C14 16.5 8 19 8.5 16C9 14.5 13 13.5 16 13.5" fill="#fff" opacity=".62"/>
    <path d="M16 13.5C18 16.5 24 19 23.5 16C23 14.5 19 13.5 16 13.5" fill="#fff" opacity=".62"/>
    <ellipse cx="16" cy="11" rx="1.2" ry="5.5" fill="#fff"/>
    <path d="M15 7 Q13 4 12.5 3.5" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>
    <path d="M17 7 Q19 4 19.5 3.5" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>
  </g>
</svg>
</body></html>`;

const tmp = join(ROOT, 'tools', '.icon-render.html');

if (!existsSync(CHROME)) {
  console.error(`找不到 Chrome：${CHROME}\n可用 CHROME_PATH 环境变量指定`);
  process.exit(1);
}

for (const size of [192, 512]) {
  const out = join(PUBLIC, `icon-${size}.png`);
  writeFileSync(tmp, htmlFor(size));
  const fileUrl = 'file:///' + tmp.replace(/\\/g, '/');
  const r = spawnSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--screenshot=${out.replace(/\\/g, '/')}`,
      `--window-size=${size},${size}`,
      fileUrl,
    ],
    { stdio: 'pipe', timeout: 60000 }
  );

  if (!existsSync(out)) {
    console.error(`✕ icon-${size}.png 没生成`);
    console.error(String(r.stderr).slice(-400));
    process.exit(1);
  }
  console.log(`✓ icon-${size}.png  ${(statSync(out).size / 1024).toFixed(1)} KB`);
}

rmSync(tmp, { force: true });
