/**
 * 四象限归组的单元测试 —— 重点盯「周期任务的子任务不该进四象限」这条。
 *
 * 背景（2026-11-11 的真实 bug）：周期任务的子任务全跑到「立即执行」里去了，
 * 而且往期克隆出来的也在。根因是「父级不在候选集合里就提升为根」的兜底
 * 把「父是周期任务」也当成了「父已完成」。
 *
 * 铁律同 date.test.mjs：直接 import 生产代码，不复制实现。
 */

import { buildQuadrantGroups, collectPending, hasRecurringAncestor, countQuadrantRoots } from '../src/lib/quadrant.ts';

let pass = 0;
let fail = 0;
const failures = [];

function eq(actual, expected, label) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    failures.push(`${label}\n    期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

const T0 = new Date('2026-11-01T09:00:00+08:00').getTime();
const DAY = 86400000;

let seq = 0;
function T(over = {}) {
  return {
    id: over.id ?? `id${++seq}`,
    title: over.title ?? `任务${seq}`,
    urgency: 'high',
    importance: 'high',
    status: 'todo',
    createdAt: T0 + seq * DAY,
    ...over,
  };
}

/** 任务数组 → id 串（all() 已经摊平成串，这里也放行） */
const ids = (list) => (Array.isArray(list) ? list.map((t) => t.id).join(',') : String(list));
/** 四格摊平后的 id 串 */
const all = (grouped) => [...grouped.do, ...grouped.schedule, ...grouped.delegate, ...grouped.eliminate].map((t) => t.id).join(',');

// ---------------------------------------------------------------- 1
console.log('=== 1. 周期任务本体不进四象限 ===');
{
  const rec = T({ id: 'rec', recurrence: 'daily', templateId: 'tpl' });
  const g = buildQuadrantGroups([rec]);
  eq(ids(all(g)), '', '周期任务本体不出现');
}

// ---------------------------------------------------------------- 2
console.log('=== 2. 当前期的子任务不进（本次 bug 主现场） ===');
{
  const rec = T({ id: 'rec', recurrence: 'daily', templateId: 'tpl' });
  const s1 = T({ id: 's1', parentId: 'rec' });
  const s2 = T({ id: 's2', parentId: 'rec', urgency: 'low', importance: 'low' });
  const g = buildQuadrantGroups([rec, s1, s2]);
  eq(ids(all(g)), '', '当前期子任务一条都不进');
  eq(countQuadrantRoots([rec, s1, s2]), 0, '头部计数不含周期子任务');
}

// ---------------------------------------------------------------- 3
console.log('=== 3. 往期已完成实例的子任务也不进 ===');
{
  // 上一期已经完成，子任务还开着 —— 这是最容易被「提升为根」捞走的一类
  const prev = T({ id: 'prev', recurrence: 'weekly', templateId: 'tpl', status: 'done', finishedAt: T0 });
  const child = T({ id: 'prevChild', parentId: 'prev' });
  const g = buildQuadrantGroups([prev, child]);
  eq(ids(all(g)), '', '父已完成但父是周期任务 → 子任务不进象限');
}

// ---------------------------------------------------------------- 4
console.log('=== 4. 多层嵌套：孙任务同样不进 ===');
{
  const rec = T({ id: 'rec', recurrence: 'monthly', templateId: 'tpl' });
  const child = T({ id: 'child', parentId: 'rec' });
  const grand = T({ id: 'grand', parentId: 'child' });
  const great = T({ id: 'great', parentId: 'grand' });
  const byId = new Map([rec, child, grand, great].map((t) => [t.id, t]));
  eq(hasRecurringAncestor(great, byId), true, '曾孙能追到周期祖先');
  eq(ids(all(buildQuadrantGroups([rec, child, grand, great]))), '', '整条链都不进象限');
}

// ---------------------------------------------------------------- 5
console.log('=== 5. 普通任务的「父已完成、子未完成」仍要提升为根 ===');
{
  // 这条不能修坏了：cycleStatus 不级联子任务，这个状态真实存在
  const parent = T({ id: 'p', status: 'done', finishedAt: T0 });
  const child = T({ id: 'c', parentId: 'p', createdAt: T0 + 5 * DAY });
  const g = buildQuadrantGroups([parent, child]);
  eq(ids(all(g)), 'c', '子任务被提升为根、仍在象限里');
  eq(ids(g.do), 'c', '落到它自己的象限');
}

// ---------------------------------------------------------------- 6
console.log('=== 6. 普通父子结构：只有父进象限 ===');
{
  const parent = T({ id: 'p' });
  const child = T({ id: 'c', parentId: 'p' });
  const g = buildQuadrantGroups([parent, child]);
  eq(ids(all(g)), 'p', '子任务跟着父渲染，不单独占一格');
  eq(countQuadrantRoots([parent, child]), 1, '计数只算根');
}

// ---------------------------------------------------------------- 7
console.log('=== 7. 完成 / 进存储柜的不进 ===');
{
  const done = T({ id: 'done', status: 'done', finishedAt: T0 });
  const trashed = T({ id: 'trash', isTrashed: true });
  const alive = T({ id: 'alive', urgency: 'low', importance: 'high' });
  const g = buildQuadrantGroups([done, trashed, alive]);
  eq(ids(all(g)), 'alive', '只留未完成未删除的');
  eq(ids(g.schedule), 'alive', '低紧急+高重要 → 计划安排');
}

// ---------------------------------------------------------------- 8
console.log('=== 8. 排序：进行中优先，其次新的在前 ===');
{
  const a = T({ id: 'a', status: 'todo', createdAt: T0 });
  const b = T({ id: 'b', status: 'in_progress', createdAt: T0 - 9 * DAY });
  const c = T({ id: 'c', status: 'todo', createdAt: T0 + 3 * DAY });
  const g = buildQuadrantGroups([a, b, c]);
  eq(ids(g.do), 'b,c,a', '进行中排最前，其余按创建时间倒序');
}

// ---------------------------------------------------------------- 9
console.log('=== 9. 脏数据：父级 id 悬空当作根 ===');
{
  const orphan = T({ id: 'o', parentId: 'no-such-parent', urgency: 'high', importance: 'low' });
  const g = buildQuadrantGroups([orphan]);
  eq(ids(g.delegate), 'o', '父级不存在的任务不能被吞掉');
}

// ---------------------------------------------------------------- 10
console.log('=== 10. collectPending 与分组总数口径一致 ===');
{
  const rec = T({ id: 'rec', recurrence: 'daily', templateId: 'tpl' });
  const s = T({ id: 's', parentId: 'rec' });
  const p = T({ id: 'p' });
  const c = T({ id: 'c', parentId: 'p' });
  const list = [rec, s, p, c];
  eq(collectPending(list).length, 2, '候选集合是 p 和 c 两条');
  eq(countQuadrantRoots(list), 1, '根只有 p 一条');
}

// ----------------------------------------------------------------
console.log('\n' + '='.repeat(52));
if (fail > 0) {
  for (const f of failures) console.log('  ✗ ' + f);
  console.log(`\n失败 ${fail} / ${pass + fail}`);
  process.exit(1);
}
console.log(`通过 ${pass} / ${pass}`);
console.log('全部通过 ✓');
