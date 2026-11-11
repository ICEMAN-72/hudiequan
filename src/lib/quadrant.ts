/**
 * 四象限的归组逻辑 —— 抽成纯函数，为了能被单测直接 import。
 *
 * 这里只有一个真正容易出错的地方：**哪些任务该进四象限**。
 * 历史上的规则是「未完成 + 非周期任务」，看起来够了，漏掉了周期任务的子任务：
 *
 *   - 周期任务本体被过滤掉之后，它的子任务就找不到父级了；
 *   - 而下面那段「父级不在集合里就提升为根」的兜底，本意是处理
 *     「父任务已完成、子任务还开着」，结果把周期任务的子任务也一并兜了进去；
 *   - 于是每一期克隆出来的子任务（改期任务时 `cycleStatus` 会复制一份）
 *     全都变成「孤儿根」，堆在四象限里；子任务的紧急/重要继承自模板，
 *     通常都是高/高，所以看起来就是「所有周期子任务全跑到立即执行」。
 *
 * 正确口径：周期任务的子任务属于「那一期的执行清单」，归属地是周期任务面板，
 * 不进四象限；判定要看**整条祖先链**，不能只看直接父级 —— 子任务还能再挂子任务。
 */

import type { Task, Quadrant } from '../types.ts';
import { getQuadrant, isRecurringTask } from '../types.ts';

const STATUS_ORDER: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };

/** 沿 parentId 往上走，祖先链里只要有一个是周期任务就算「挂在周期任务下」。 */
export function hasRecurringAncestor(task: Task, byId: Map<string, Task>): boolean {
  const seen = new Set<string>();
  let cur: Task | undefined = task;
  while (cur?.parentId && !seen.has(cur.parentId)) {
    seen.add(cur.parentId);
    const parent = byId.get(cur.parentId);
    if (!parent) return false; // 父级已不存在（脏数据），当作普通根任务
    if (isRecurringTask(parent)) return true;
    cur = parent;
  }
  return false;
}

/**
 * 四象限的候选集合：未完成、未进存储柜、自己不是周期任务、祖先里也没有周期任务。
 * 排序在这里不做 —— 调用方还要按「是否根」二次筛选。
 */
export function collectPending(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return tasks.filter(
    (t) =>
      !t.isTrashed &&
      t.status !== 'done' &&
      !isRecurringTask(t) &&
      !hasRecurringAncestor(t, byId)
  );
}

/**
 * 按象限归组。父级不在候选集合里的任务（父已完成、父被删、父是周期任务）
 * 会被提升为根，否则它会在列表里凭空消失。
 */
export function buildQuadrantGroups(tasks: Task[]): Record<Quadrant, Task[]> {
  const pending = collectPending(tasks);
  const pendingIds = new Set(pending.map((t) => t.id));

  const grouped: Record<Quadrant, Task[]> = { do: [], schedule: [], delegate: [], eliminate: [] };
  for (const task of pending) {
    const isRoot = !task.parentId || !pendingIds.has(task.parentId);
    if (isRoot) grouped[getQuadrant(task)].push(task);
  }

  for (const q of Object.keys(grouped) as Quadrant[]) {
    grouped[q].sort((a, b) => {
      if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return b.createdAt - a.createdAt;
    });
  }
  return grouped;
}

/** 四象限头部那个「N 项待办」 */
export function countQuadrantRoots(tasks: Task[]): number {
  const grouped = buildQuadrantGroups(tasks);
  return (Object.keys(grouped) as Quadrant[]).reduce((n, q) => n + grouped[q].length, 0);
}
