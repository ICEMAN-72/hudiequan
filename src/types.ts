export interface Task {
  id: string;
  title: string;
  urgency: 'high' | 'low';
  importance: 'high' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  parentId?: string;
  dateType?: 'none' | 'point' | 'range';
  startDate?: string;
  endDate?: string;
  createdAt: number;
  /** 完成时刻。进入 done 时写入，离开 done 时清除。统计口径以此为准 */
  finishedAt?: number;
  isTrashed?: boolean;
  notes?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  /** 周期任务的身份标识：每个周期模板的所有历史实例共享同一个 templateId */
  templateId?: string;
}

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type DateType = 'none' | 'point' | 'range';
export type SortOption = 'default' | 'status' | 'created' | 'children' | 'category' | 'age';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

/**
 * 是否真的是周期任务。
 * 注意：recurrence 字段可能是 'none'（旧数据迁移、编辑表单回写都会留下这个值），
 * 所以不能用 `!task.recurrence` 判断 —— 'none' 是 truthy，会让普通任务凭空消失。
 */
export function isRecurringTask(task: Task): boolean {
  return !!task.recurrence && task.recurrence !== 'none';
}

export function getQuadrant(task: Task): Quadrant {
  if (task.urgency === 'high' && task.importance === 'high') return 'do';
  if (task.urgency === 'low' && task.importance === 'high') return 'schedule';
  if (task.urgency === 'high' && task.importance === 'low') return 'delegate';
  return 'eliminate';
}

export function getEffectiveQuadrant(task: Task, allTasks: Task[]): Quadrant {
  if (!task.parentId) return getQuadrant(task);
  const parent = allTasks.find((t) => t.id === task.parentId);
  return parent ? getQuadrant(parent) : getQuadrant(task);
}

export function getDescendantIds(taskId: string, allTasks: Task[]): string[] {
  const ids: string[] = [];
  const children = allTasks.filter((t) => t.parentId === taskId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child.id, allTasks));
  }
  return ids;
}

export function isDescendantOf(targetId: string, ancestorId: string, allTasks: Task[]): boolean {
  if (targetId === ancestorId) return true;
  const target = allTasks.find((t) => t.id === targetId);
  if (target?.parentId) return isDescendantOf(target.parentId, ancestorId, allTasks);
  return false;
}

/** Check if a task overlaps with a given date string (YYYY-MM-DD) */
export function taskOnDate(task: Task, dateStr: string): boolean {
  if (!task.dateType || task.dateType === 'none') return false;
  if (task.dateType === 'point') return task.startDate === dateStr;
  if (task.dateType === 'range' && task.startDate && task.endDate) {
    return dateStr >= task.startDate && dateStr <= task.endDate;
  }
  return false;
}

/** Format date for display: 'YYYY-MM-DD' → 'M月D日' */
export function formatDateDisplay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

/** Format date range for display */
export function formatDateRange(task: Task): string {
  if (!task.startDate) return '';
  if (task.dateType === 'point') return formatDateDisplay(task.startDate);
  if (task.dateType === 'range' && task.endDate) {
    return `${formatDateDisplay(task.startDate)} ~ ${formatDateDisplay(task.endDate)}`;
  }
  return '';
}

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  todo: {
    label: '待办',
    dot: '#A8A4BE',
    text: 'text-violet-400',
    bg: 'bg-violet-50/30',
    border: 'border-violet-100/40',
  },
  in_progress: {
    label: '进行中',
    dot: '#7C3AED',
    text: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  done: {
    label: '已完成',
    dot: '#EC4899',
    text: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
};

/**
 * 四象限配色 —— 颜色直接说出这个格子是什么性质，不是随手挑的四种颜色：
 *
 *   立即执行  火红   火已经烧起来了，现在不动就晚了
 *   计划安排  靛蓝   蓝图、沉淀、长期，需要安静地想
 *   委托处理  琥珀   交接给别人，带提醒/等待的意味
 *   尽量减少  石板   退到背景里，不值得占用注意力
 *
 * 四色相拉开约 0°/36°/243°/215°（石板为低饱和），既能一眼分辨，
 * 又不会像四个荧光块。具体底色在 index.css 的 .quad-tile--* 里，
 * 不放这里：底色必须能写 .dark 覆盖，而工具类改不动无层级样式。
 */
export const QUADRANT_CONFIG: Record<
  Quadrant,
  {
    label: string;
    subtitle: string;
    accent: string;
    accentLight: string;
    text: string;
    headerText: string;
  }
> = {
  do: {
    label: '立即执行',
    subtitle: '紧急 · 重要',
    accent: '#DC2626',
    accentLight: 'rgba(220, 38, 38, 0.14)',
    text: 'text-red-700',
    headerText: 'text-red-800',
  },
  schedule: {
    label: '计划安排',
    subtitle: '不紧急 · 重要',
    accent: '#4F46E5',
    accentLight: 'rgba(79, 70, 229, 0.14)',
    text: 'text-indigo-700',
    headerText: 'text-indigo-800',
  },
  delegate: {
    label: '委托处理',
    subtitle: '紧急 · 不重要',
    accent: '#D97706',
    accentLight: 'rgba(217, 119, 6, 0.14)',
    text: 'text-amber-700',
    headerText: 'text-amber-800',
  },
  eliminate: {
    label: '尽量减少',
    subtitle: '不紧急 · 不重要',
    accent: '#64748B',
    accentLight: 'rgba(100, 116, 139, 0.14)',
    text: 'text-slate-600',
    headerText: 'text-slate-600',
  },
};

export const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};
