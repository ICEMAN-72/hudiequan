/**
 * 日期逻辑单元测试 —— 重点验证「周期任务下期日期」不再因时区偏移退回前一天。
 * 运行：npm test
 *
 * 两条铁律：
 * 1. 直接 import 生产代码 src/lib/date.ts，绝不复制一份实现来测。
 *    早期就是复制了实现，结果测的一直是副本 —— 生产代码改坏了测试照样全绿。
 * 2. 所有跟「今天」有关的断言都必须注入 NOW，否则断言会随运行日期漂移
 *    （10/20 写的测试 10/27 跑就红了，明明代码是对的）。
 */

import {
  toDateStr,
  parseDateStr,
  addDaysStr,
  startOfWeekStr,
  nextOccurrence,
  diffDays,
} from '../src/lib/date.ts';

/** 固定「今天」，让所有断言可重复 */
const NOW = '2026-10-20';

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

console.log('=== 1. 每月：永远是下月 1 号，不能退回上月底 ===');
// 这是原来最严重的 bug：new Date(y, m+1, 1).toISOString().slice(0,10)
// 在东八区会得到「当月最后一天」
for (const [y, m] of [[2026, 0], [2026, 1], [2026, 9], [2026, 11]]) {
  const d = new Date(y, m + 1, 1);
  const got = toDateStr(d);
  const expected = `${m + 1 === 12 ? y + 1 : y}-${((m + 1) % 12) + 1 < 10 ? '0' : ''}${((m + 1) % 12) + 1}-01`;
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
  const next = nextOccurrence('weekly', base, NOW);
  eq(parseDateStr(next).getDay(), 1, `${base} 的下周日期 ${next} 是周一`);
  eq(next > base, true, `${base} 的下周日期必须晚于基准日`);
}

console.log('\n=== 3. 每天：严格 +1 天 ===');
eq(nextOccurrence('daily', '2026-10-20', NOW), '2026-10-21', '10/20 → 10/21');
eq(nextOccurrence('daily', '2026-10-31', NOW), '2026-11-01', '10/31 → 11/01 跨月');
eq(nextOccurrence('daily', '2026-12-31', NOW), '2027-01-01', '12/31 → 01/01 跨年');
eq(nextOccurrence('daily', '2028-02-28', NOW), '2028-02-29', '闰年 2/28 → 2/29');
eq(nextOccurrence('daily', '2027-02-28', NOW), '2027-03-01', '平年 2/28 → 3/01');

console.log('\n=== 4. 过期基准日：从今天往后算，不补历史 ===');
const oldBase = '2020-01-01';
eq(nextOccurrence('daily', oldBase, NOW), addDaysStr(NOW, 1), '过期的 daily 从今天起算 → 明天');
eq(nextOccurrence('monthly', oldBase, NOW), '2026-11-01', '过期的 monthly 从今天起算 → 下月 1 号');
eq(nextOccurrence('weekly', oldBase, NOW), '2026-10-26', '过期的 weekly 从今天起算 → 下周一');

console.log('\n=== 5. 周一 → 下周一（不是当天）===');
// 2026-10-19 是周一
eq(parseDateStr('2026-10-19').getDay(), 1, '确认 2026-10-19 是周一');
eq(nextOccurrence('weekly', '2026-10-19', NOW), '2026-10-26', '周一完成的任务，下期是 7 天后而不是当天');

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
    const next = nextOccurrence('monthly', cur, NOW);
    const d = parseDateStr(next);
    if (d.getDate() !== 1) { ok = false; break; }
    if (next <= cur) { ok = false; break; }
    cur = next;
  }
  eq(ok, true, '连续 30 次 monthly 推进，每次都落在 1 号且严格递增');
}

console.log('\n=== 9. 跨年边界 ===');
eq(nextOccurrence('monthly', '2026-12-05', NOW), '2027-01-01', '12 月的 monthly 下期是次年 1/1');
eq(nextOccurrence('daily', '2026-12-31', NOW), '2027-01-01', '跨年 daily');
eq(diffDays('2026-10-19', '2026-10-26'), 7, '跨周相差 7 天');
eq(diffDays('2026-12-31', '2027-01-01'), 1, '跨年相差 1 天');

console.log(`\n${'='.repeat(52)}`);
console.log(`通过 ${pass} / ${pass + fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  ✕ ${f}`);
  process.exit(1);
}
console.log('全部通过 ✓');
