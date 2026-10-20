/**
 * 蝴蝶泉视觉验收截图 —— 一条命令产出全套面板截图。
 *
 * 用法：npm run build && node tools/screenshot.mjs
 * 产物：tools/shots/*.png
 *
 * 单进程：静态服务 dist + CDP 注入种子数据 + 多场景截图。
 * 为什么单进程：沙箱会在命令结束时回收本命令派生的所有子进程，
 * 所以预览服务不能单独 nohup 起来，必须和截图脚本同生共死。
 *
 * 用法：node tools/verify.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'tools', 'shots');
const BASE = '/hudiequan/';
const HTTP_PORT = 4173;
const CDP_PORT = Number(process.env.CDP_PORT) || 9888;

mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// ---------- 1. 静态服务 ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p.startsWith(BASE)) p = p.slice(BASE.length - 1);
  if (p === '/' || p === '') p = '/index.html';
  const file = join(DIST, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } else {
    // SPA 回退
    res.writeHead(200, { 'content-type': MIME['.html'] });
    createReadStream(join(DIST, 'index.html')).pipe(res);
  }
});

await new Promise((r) => server.listen(HTTP_PORT, '127.0.0.1', r));
console.log(`static server on http://127.0.0.1:${HTTP_PORT}${BASE}`);

// ---------- 1.5 自己拉起 Chrome（沙箱会回收本命令派生的子进程，
// 所以浏览器必须由本进程持有，脚本结束一起退出） ----------
const CHROME =
  process.env.CHROME_PATH ||
  'C:////Users////22015////.agent-browser////browsers////chrome-152.0.7977.64////chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'pf3-chrome-'));
const chromium = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore', detached: false }
);
console.log('chrome pid', chromium.pid);

// ---------- 2. 连 CDP ----------
function httpGetJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: CDP_PORT, path, timeout: 2000 }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

let target = null;
for (let i = 0; i < 30; i++) {
  try {
    const list = await httpGetJson('/json/list');
    target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (target) break;
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 250));
}
if (!target) throw new Error('连不上 CDP');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1680,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const APP = `http://127.0.0.1:${HTTP_PORT}${BASE}`;

async function evalJs(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}

async function shot(name, clip) {
  const params = { format: 'png' };
  if (clip) params.clip = { scale: 2.2, ...clip };
  const { data } = await send('Page.captureScreenshot', params);
  writeFileSync(join(OUT, name + '.png'), Buffer.from(data, 'base64'));
  console.log('  saved', name);
}

// ---------- 3. 种子数据 ----------
function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}
function ds(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ds(d);
}
const DAY = 86400000;
const now = Date.now();

const T = (o) => ({
  urgency: 'low',
  importance: 'high',
  status: 'todo',
  dateType: 'none',
  createdAt: now,
  isTrashed: false,
  recurrence: 'none',
  ...o,
});

const tasks = [
  // 立即执行
  T({
    id: 'a1',
    title: '完成蝴蝶泉 v3.2 视觉升级',
    urgency: 'high',
    importance: 'high',
    status: 'in_progress',
    dateType: 'range',
    startDate: addDays(-1),
    endDate: addDays(2),
    notes: '重点：呼出面板的圆角裁切、层次粘连、深色模式漏色。\n验收标准：所有面板在 1280×800 下内容不被圆角切到。',
    createdAt: now - 3 * DAY,
  }),
  T({
    id: 'a1-1',
    title: '抽出统一的 Modal 容器',
    urgency: 'high',
    importance: 'high',
    status: 'done',
    parentId: 'a1',
    finishedAt: now - 6 * 3600000,
    createdAt: now - 3 * DAY,
  }),
  T({
    id: 'a1-2',
    title: '日历日视图重做',
    urgency: 'high',
    importance: 'high',
    status: 'in_progress',
    parentId: 'a1',
    createdAt: now - 2 * DAY,
  }),
  T({
    id: 'a2',
    title: '验收自动备份在 Edge 上的权限弹窗',
    urgency: 'high',
    importance: 'high',
    dateType: 'point',
    startDate: addDays(1),
    createdAt: now - 1 * DAY,
  }),
  // 计划安排
  T({
    id: 'b1',
    title: '整理本月阅读笔记并归档到万重浪',
    urgency: 'low',
    importance: 'high',
    dateType: 'point',
    startDate: addDays(3),
    notes: '优先处理《医学信息学》第三章。',
    createdAt: now - 5 * DAY,
  }),
  T({
    id: 'b2',
    title: '把三段项目经历改写成 STAR 结构',
    urgency: 'low',
    importance: 'high',
    createdAt: now - 4 * DAY,
  }),
  T({
    id: 'b3',
    title: '每周复盘：这周哪些时间被浪费了',
    urgency: 'low',
    importance: 'high',
    recurrence: 'weekly',
    templateId: 'tpl-b3',
    createdAt: now - 10 * DAY,
  }),
  // 委托处理
  T({
    id: 'c1',
    title: '把简历发给师兄走内推',
    urgency: 'high',
    importance: 'low',
    createdAt: now - 2 * DAY,
  }),
  T({
    id: 'c2',
    title: '回复实验室群里关于设备借用的问题',
    urgency: 'high',
    importance: 'low',
    status: 'in_progress',
    createdAt: now - 1 * DAY,
  }),
  // 尽量减少
  T({
    id: 'd1',
    title: '刷完那部剧的第二季',
    urgency: 'low',
    importance: 'low',
    createdAt: now - 8 * DAY,
  }),
  // 周期任务：本期 + 往期
  T({
    id: 'r1',
    title: '记录体重与体脂',
    urgency: 'low',
    importance: 'high',
    recurrence: 'monthly',
    templateId: 'tpl-r1',
    dateType: 'point',
    startDate: addDays(5),
    createdAt: now - 20 * DAY,
  }),
  T({
    id: 'r1-prev',
    title: '记录体重与体脂',
    urgency: 'low',
    importance: 'high',
    recurrence: 'monthly',
    templateId: 'tpl-r1',
    status: 'done',
    dateType: 'point',
    startDate: addDays(-25),
    finishedAt: now - 24 * DAY,
    createdAt: now - 50 * DAY,
  }),
  // 统计用的近期完成
  ...Array.from({ length: 9 }).map((_, i) =>
    T({
      id: 'h' + i,
      title: ['写周报', '背单词', '跑步 5km', '整理桌面', '读论文', '回邮件', '复盘日程', '洗衣服', '写代码'][i],
      urgency: 'high',
      importance: 'high',
      status: 'done',
      finishedAt: now - Math.floor(i / 2) * DAY - 2 * 3600000,
      createdAt: now - (i + 2) * DAY,
    })
  ),
];

const seedTasks = JSON.stringify({ state: { tasks, sortBy: 'default' }, version: 5 });
const seedLight = JSON.stringify({ state: { fontSize: 18, showCompleted: true, darkMode: false, reviewEnabled: true, reviewTime: '17:30', autoBackupEnabled: false }, version: 0 });
const seedDark = JSON.stringify({ state: { fontSize: 18, showCompleted: true, darkMode: true, reviewEnabled: true, reviewTime: '17:30', autoBackupEnabled: false }, version: 0 });

console.log('seeding...');
await send('Page.navigate', { url: APP });
await sleep(1500);
await evalJs(`
  localStorage.setItem('hudiequan-tasks', ${JSON.stringify(seedTasks)});
  localStorage.setItem('hudiequan-settings', ${JSON.stringify(seedLight)});
  localStorage.setItem('hudiequan-review-fired', String(new Date().toDateString()));
  'ok'
`);

async function reload(dark) {
  await evalJs(`localStorage.setItem('hudiequan-settings', ${JSON.stringify(dark ? seedDark : seedLight)}); 'ok'`);
  await send('Page.navigate', { url: APP });
  await sleep(2200);
}

const clickByText = (text) =>
  evalJs(`
    (() => {
      const nodes = [...document.querySelectorAll('button')];
      const hit =
        nodes.find(n => (n.getAttribute('title') || '') === ${JSON.stringify(text)}) ||
        nodes.find(n => (n.getAttribute('aria-label') || '') === ${JSON.stringify(text)}) ||
        nodes.find(n => n.textContent.trim() === ${JSON.stringify(text)});
      if (!hit) return 'MISS:${text}';
      hit.click();
      return 'OK';
    })()
  `);
const closeModal = () =>
  evalJs(`document.querySelector('.anim-backdrop-in')?.click(); 'x'`);

// ---------- 4. 场景 ----------
console.log('--- light ---');
await reload(false);
await sleep(500);
await shot('01-main-light-zoom');

// 面板：设置
console.log(await clickByText('设置'));
await sleep(800);
await shot('02-settings');
await closeModal();
await sleep(500);

console.log(await clickByText('统计'));
await sleep(900);
await shot('03-stats');
await closeModal();
await sleep(500);

console.log(await clickByText('存储柜'));
await sleep(900);
await shot('04-cabinet');
await closeModal();
await sleep(500);

console.log(await clickByText('云端同步'));
await sleep(800);
await shot('05-cloud');
await closeModal();
await sleep(500);

console.log('--- dark ---');
await reload(true);
await sleep(600);
await shot('06-main-dark');

console.log(await clickByText('统计'));
await sleep(900);
await shot('07-stats-dark');
await closeModal();
await sleep(400);

console.log(await clickByText('设置'));
await sleep(900);
await shot('08-settings-dark');
await closeModal();
await sleep(400);

// 新建任务抽屉（FAB）
await reload(false);
await sleep(700);
console.log(await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find(n => n.className.includes('fixed') && n.className.includes('bottom-5'));
  if (!b) return 'MISS:FAB';
  b.click(); return 'OK';
})()`));
await sleep(900);
await shot('10-newtask');
await closeModal();
await sleep(400);

// 新建任务抽屉（FAB）
await reload(false);
await sleep(700);
console.log(await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find(n => n.className.includes('fixed') && n.className.includes('bottom-5'));
  if (!b) return 'MISS:FAB';
  b.click(); return 'OK';
})()`));
await sleep(900);
await shot('10-newtask');
await closeModal();
await sleep(400);

// 日历：切到日视图（点击「日」按钮）
await reload(false);
await sleep(600);
console.log(await clickByText('日'));
await sleep(700);
await shot('09-calendar-day');

// 局部放大：任务列表 / 四象限
await reload(false);
await sleep(900);
await shot('z1-tasklist', { x: 0, y: 30, width: 530, height: 310 });
await shot('z2-quadrant', { x: 530, y: 30, width: 1150, height: 305 });
await shot('z3-recurring', { x: 0, y: 345, width: 530, height: 220 });
await shot('z4-header', { x: 500, y: 0, width: 1180, height: 32 });

// 设置面板局部（检查圆角裁切）
console.log(await clickByText('设置'));
await sleep(900);
await shot('z5-settings-card', { x: 380, y: 40, width: 920, height: 760 });
await closeModal();

console.log('done');
ws.close();
server.close();
try { chromium.kill(); } catch {}
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
