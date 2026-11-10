/**
 * 主题审计：找出「深色模式下会漏」的地方。
 * 运行：node tools/audit-theme.mjs
 *
 * 两件事：
 * 1. 扫 src 里用到的 Tailwind 颜色类，和 index.css 里的 `.dark .xxx` 规则做差集 ——
 *    没被覆盖的类，深色模式下就是原色，浅底会变成一块白板。
 * 2. 扫所有 inline style 里的 background —— inline 的优先级高于任何 .dark 规则，
 *    色值偏亮的一律标记（NewTaskForm 的三块光板就是这么来的）。
 *
 * 注意这只是「候选清单」，不是「错误清单」：
 * 有些类深色下本来就该保持原样（text-white、bg-transparent），
 * 有些被更高层级的选择器整体接管了。人工过一遍再决定补哪些。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** 递归收集文件 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f));

/* ───────── 1. 颜色类 vs .dark 覆盖 ───────── */

// 调色板 + 明度级别 + 可选透明度后缀。
// 变体前缀（hover:/focus:/group-hover:…）要连着抓：
// 覆盖规则写的是 `.dark .hover\:bg-teal-50\/40:hover`，
// 只抓 bg-teal-50/40 对比会假报——它其实是有覆盖的。
const VARIANT = '(?:(?:hover|focus|focus-within|active|disabled|group-hover|first|last|odd|even):)*';
const COLOR_CLASS = new RegExp(
  `\\b(${VARIANT}(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow|placeholder|decoration|accent|caret)-(?:white|black|violet|pink|teal|amber|blue|stone|orange|green|red|indigo|purple|slate|gray|zinc|neutral|emerald|cyan|sky|rose|lime|yellow|fuchsia)(?:-\\d{2,3})?(?:\\/\\d{2,3})?)\\b`,
  'g'
);

/** @type {Map<string, Set<string>>} 类名 → 出现文件 */
const usedColors = new Map();
for (const f of files) {
  if (!/\.tsx?$/.test(f)) continue;
  const code = readFileSync(f, 'utf8');
  for (const m of code.matchAll(COLOR_CLASS)) {
    const cls = m[1];
    if (!usedColors.has(cls)) usedColors.set(cls, new Set());
    usedColors.get(cls).add(relative(ROOT, f).replace(/\\/g, '/'));
  }
}

const css = readFileSync(join(SRC, 'index.css'), 'utf8');

/**
 * CSS 选择器 → 源码里那种类名。
 *
 * 麻烦在于转义冒号和伪类冒号长一样：`.hover\:bg-blue-50\/40:hover`。
 * 直接 split(':') 会把整段截成 "hover"。所以先把转义冒号换成占位符，
 * 去掉末尾伪类，再换回来。
 */
function normalizeSelector(sel) {
  const MARK = '\uE000'; // 私有区字符：CSS 里不会出现，也不会触发 no-control-regex
  return (
    sel
      .replace(/\\:/g, MARK)
      // 只删「末尾」伪类：focus-within 这个变体名本身含 :focus，
      // 不加末尾锚点会把 .focus-within\:bg-white 的前缀整段吃掉。
      .replace(/:(?:hover|focus|focus-within|active|disabled|first|last|odd|even)$/, '')
      .split(MARK)
      .join(':')
      .replace(/\\/g, '')
  );
}

const covered = new Set();
for (const m of css.matchAll(/\.dark\s+([^{]+)\{/g)) {
  for (const part of m[1].split(/[\s>+~,]+/)) {
    if (!part.startsWith('.')) continue;
    covered.add(normalizeSelector(part.slice(1)));
  }
}

const missing = [...usedColors.entries()]
  .filter(([cls]) => !covered.has(cls))
  .filter(([cls]) => !/^(bg|text|border|ring|from|via|to|fill|stroke|placeholder|divide|outline|shadow|decoration|accent|caret)-(white|black|transparent|current)/.test(cls))
  .sort((a, b) => a[0].localeCompare(b[0]));

/* ───────── 2. inline 背景亮度 ───────── */

/** 'rgba(243, 232, 255, 0.6)' | '#F3E8FF' → 亮度 0~255 */
function luminance(str) {
  const hex = str.match(/#([0-9a-fA-F]{6})\b/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  }
  const rgb = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return 0.299 * +rgb[1] + 0.587 * +rgb[2] + 0.114 * +rgb[3];
  }
  return null;
}

const brightInline = [];
for (const f of files) {
  if (!/\.tsx?$/.test(f)) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!/background/i.test(line)) return;
    if (!/rgba?\(|#[0-9a-fA-F]{6}/.test(line)) return;
    const colors = line.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{6}/g) || [];
    const lums = colors.map(luminance).filter((v) => v !== null);
    if (!lums.length) return;
    const brightest = Math.max(...lums);
    if (brightest >= 190) {
      brightInline.push({
        file: relative(ROOT, f).replace(/\\/g, '/'),
        line: i + 1,
        lum: Math.round(brightest),
        snippet: line.trim().slice(0, 110),
      });
    }
  });
}

/* ───────── 报告 ───────── */

console.log('=== 1. 没有 .dark 覆盖的颜色类 ===');
if (missing.length === 0) {
  console.log('  （无）');
} else {
  for (const [cls, fs] of missing) {
    console.log(`  ✕ ${cls.padEnd(34)} ${[...fs].join(', ')}`);
  }
  console.log(`\n  共 ${missing.length} 个候选，逐个确认深色下是否需要单独覆盖。`);
}

console.log('\n=== 2. inline 背景里偏亮的色值（深色下会发光）===');
if (brightInline.length === 0) {
  console.log('  （无）');
} else {
  for (const b of brightInline) {
    console.log(`  ! ${b.file}:${b.line}  亮度 ${b.lum}`);
    console.log(`      ${b.snippet}`);
  }
  console.log(`\n  共 ${brightInline.length} 处。inline 优先级高于 .dark，只能改类。`);
  console.log(`
  判读参考 —— 下面两类属于「有意保留」，不用改：
    · 任务状态圈的填充 #EDE9FE / 描边 #C4B5FD：17px 的小圆点，
      高对比就是为了让「进行中」一眼可辨，压暗会失去识别度。
    · Modal / FloatingWindow 的 iconBg 图标徽章：浅色圆角块本身就是设计，
      深色下读起来像一枚彩色标签，不是「漏色」。
  真正的漏色长这样：大面积容器（卡片、区块、面板）用了浅色渐变，
  例如曾经 NewTaskForm 的三块纸、ReviewModal 的两张数据卡 —— 整块发亮。`);
}
