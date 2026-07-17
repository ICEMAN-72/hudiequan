export interface Task {
  id: string;
  title: string;
  urgency: 'high' | 'low';
  importance: 'high' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  parentId?: string;
  dateType?: 'none' | 'point' | 'range';
  startDate?: string; // ISO date 'YYYY-MM-DD'
  endDate?: string;   // ISO date 'YYYY-MM-DD'
  createdAt: number;
}

export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type DateType = 'none' | 'point' | 'range';

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

export const QUADRANT_CONFIG: Record<
  Quadrant,
  {
    label: string;
    subtitle: string;
    accent: string;
    accentLight: string;
    bg: string;
    border: string;
    text: string;
    headerBg: string;
    headerText: string;
    badge: string;
  }
> = {
  do: {
    label: '立即执行',
    subtitle: '紧急 · 重要',
    accent: '#EC4899',
    accentLight: 'rgba(236, 72, 153, 0.12)',
    bg: 'bg-pink-50/50',
    border: 'border-pink-100/60',
    text: 'text-pink-700',
    headerBg: 'bg-pink-50/80',
    headerText: 'text-pink-600',
    badge: 'bg-pink-100/70 text-pink-600',
  },
  schedule: {
    label: '计划安排',
    subtitle: '不紧急 · 重要',
    accent: '#7C3AED',
    accentLight: 'rgba(124, 58, 237, 0.12)',
    bg: 'bg-violet-50/50',
    border: 'border-violet-100/60',
    text: 'text-violet-700',
    headerBg: 'bg-violet-50/80',
    headerText: 'text-violet-600',
    badge: 'bg-violet-100/70 text-violet-600',
  },
  delegate: {
    label: '委托处理',
    subtitle: '紧急 · 不重要',
    accent: '#FB923C',
    accentLight: 'rgba(251, 146, 60, 0.12)',
    bg: 'bg-orange-50/50',
    border: 'border-orange-100/60',
    text: 'text-orange-700',
    headerBg: 'bg-orange-50/80',
    headerText: 'text-orange-600',
    badge: 'bg-orange-100/70 text-orange-600',
  },
  eliminate: {
    label: '尽量减少',
    subtitle: '不紧急 · 不重要',
    accent: '#A8A4BE',
    accentLight: 'rgba(168, 164, 190, 0.12)',
    bg: 'bg-stone-50/50',
    border: 'border-stone-200/60',
    text: 'text-stone-600',
    headerBg: 'bg-stone-50/80',
    headerText: 'text-stone-500',
    badge: 'bg-stone-100/70 text-stone-500',
  },
};

export const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};
