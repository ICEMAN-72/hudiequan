/**
 * 日期逻辑单元测试 —— 重点验证「周期任务下期日期」不再因时区偏移退回前一天。
 * 运行：node test_date.mjs
 */

let pass = 0;
let fail = 0;
const failures = [];

function eq(actual, expected, label) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}\n    期望 ${expected}，实际 ${actual}`);
  }
}

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDateStr = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const addDaysStr = (s, days) => {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};
const startOfWeekStr = (s) => {
  const d = parseDateStr(s);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
};
const nextOccurrence = (recurrence, baseDate) => {
  const now = new Date();
  const today = toDateStr(now);
  const anchor = baseDate && baseDate > today ? baseDate : today;
  if (recurrence === 'daily') return addDaysStr(anchor, 1);
  if (recurrence === 'weekly') {
    const d = parseDateStr(anchor);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 1 ? 7 : (8 - dow) % 7 || 7));
    return toDateStr(d);
  }
  const d = parseDateStr(anchor);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1));
};

console.log('=== 1. 每月：永远是下月 1 号，不能退回上月底 ===');
// 这是原来最严重的 bug：new Date(y, m+1, 1).toISOString().slice(0,10)
// 在东八区会得到「当月最后一天」
for (const [y, m] of [[2026, 0], [2026, 1], [2026, 9], [2026, 11]]) {
  const d = new Date(y, m + 1, 1);
  const got = toDateStr(d);
  const expected = `${m + 1 === 12 ? y + 1 : y}-${pad2(((m + 1) % 12) + 1)}-01`;
  eq(got, expected, `${y}年${m + 1}月 的下月1号`);
}
// 直接对照旧实现，证明它确实错了
{
  const y = 2026, m = 9; // 10 月
  const oldWay = new Date(y, m + 1, 1).toISOString().slice(0, 10);
  const newWay = toDateStr(new Date(y, m + 1, 1));
  console.log(`    旧实现: ${oldWay}   新实现: ${newWay}`);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Shanghai') {
    eq(oldWay, `${y}-10-31`, '旧实现在 UTC+8 下确实返回了当月最后一天（证明 bug 存在）');
  }
  eq(newWay, `${y}-11-01`, '新实现返回 11 月 1 日');
}

console.log('\n=== 2. 每周：永远落在周一 ===');
const weeklyCases = ['2026-10-20', '2026-10-21', '2026-10-25', '2026-10-26'];
for (const base of weeklyCases) {
  const next = nextOccurrence('weekly', base);
  eq(parseDateStr(next).getDay(), 1, `${base} 的下周日期 ${next} 是周一`);
  eq(next > base, true, `${base} 的下周日期必须晚于基准日`);
}

console.log('\n=== 3. 每天：严格 +1 天 ===');
eq(nextOccurrence('daily', '2026-10-20'), '2026-10-21', '10/20 → 10/21');
eq(nextOccurrence('daily', '2026-10-31'), '2026-11-01', '10/31 → 11/01 跨月');
eq(nextOccurrence('daily', '2026-12-31'), '2027-01-01', '12/31 → 01/01 跨年');
eq(nextOccurrence('daily', '2028-02-28'), '2028-02-29', '闰年 2/28 → 2/29');
eq(nextOccurrence('daily', '2027-02-28'), '2027-03-01', '平年 2/28 → 3/01');

console.log('\n=== 4. 过期基准日：从今天往后算，不补历史 ===');
const today = toDateStr(new Date());
const oldBase = '2020-01-01';
const fromOld = nextOccurrence('daily', oldBase);
eq(fromOld > oldBase, true, '过期基准日算出的是未来日期');
eq(fromOld === addDaysStr(today, 1), true, `过期的 daily 从今天起算 → 明天 ${addDaysStr(today, 1)}`);

console.log('\n=== 5. 周一 → 下周一（不是当天）===');
// 2026-10-19 是周一
eq(parseDateStr('2026-10-19').getDay(), 1, '确认 2026-10-19 是周一');
eq(nextOccurrence('weekly', '2026-10-19'), '2026-10-26', '周一完成的任务，下期是 7 天后而不是当天');

console.log('\n=== 6. 周起点计算 ===');
eq(startOfWeekStr('2026-10-19'), '2026-10-19', '周一所在周的周一是自己');
eq(startOfWeekStr('2026-10-25'), '2026-10-19', '周日所在周的周一是 10/19');
eq(startOfWeekStr('2026-10-20'), '2026-10-19', '周二所在周的周一是 10/19');

console.log('\n=== 7. 解析不能把日期当成 UTC ===');
eq(parseDateStr('2026-10-01').getDate(), 1, "parseDateStr('2026-10-01') 的日期是 1");
eq(parseDateStr('2026-10-01').getMonth(), 9, "parseDateStr('2026-10-01') 的月份是 9（十月）");
eq(toDateStr(parseDateStr('2026-10-01')), '2026-10-01', '解析再格式化应往返一致');

console.log('\n=== 8. 跨月跨年连续推进 30 次不出错 ===');
{
  let cur = '2026-11-15';
  let ok = true;
  for (let i = 0; i < 30; i++) {
    const next = nextOccurrence('monthly', cur);
    const d = parseDateStr(next);
    if (d.getDate() !== 1) { ok = false; break; }
    if (next <= cur) { ok = false; break; }
    cur = next;
  }
  eq(ok, true, '连续 30 次 monthly 推进，每次都落在 1 号且严格递增');
}

console.log(`\n${'='.repeat(52)}`);
console.log(`通过 ${pass} / ${pass + fail}`);
if (fail > 0) {
  console.log(`\n失败项：`);
  for (const f of failures) console.log(`  ✕ ${f}`);
  process.exit(1);
}
console.log('全部通过 ✓');
