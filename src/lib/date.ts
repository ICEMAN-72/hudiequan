/**
 * 本地日期工具。
 *
 * 铁律：日期字符串 'YYYY-MM-DD' 一律表示「本地日历上的那一天」，
 * 任何格式化都必须走这里，禁止使用 `toISOString().slice(0, 10)`。
 *
 * 原因：`new Date(2026, 10, 1)` 是本地 11/1 00:00，转 UTC 后是 10/31 16:00，
 * 一旦 toISOString 截取就退回了上一天 —— 东八区每天有 8 小时会踩这个坑。
 */

export const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Date → 'YYYY-MM-DD'（本地时区） */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 今天的 'YYYY-MM-DD'（本地时区） */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** 'YYYY-MM-DD' → 本地零点的 Date（避免 new Date('2026-10-01') 被当成 UTC 解析） */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 在日期字符串上加减天数，返回新的日期字符串 */
export function addDaysStr(s: string, days: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 该日期所在周的周一 */
export function startOfWeekStr(s: string): string {
  const d = parseDateStr(s);
  const dow = d.getDay(); // 0=周日
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return toDateStr(d);
}

/** 两个日期字符串之间相差多少天（b - a） */
export function diffDays(a: string, b: string): number {
  const MS = 86400000;
  return Math.round((parseDateStr(b).getTime() - parseDateStr(a).getTime()) / MS);
}

/** 时间戳 → 'M/D HH:mm'（本地时区） */
export function formatStamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 时间戳 → 'HH:mm'（本地时区） */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 'HH:mm' 转当天分钟数 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * 计算周期任务的下一次发生日期（本地时区，永远是目标周期的第一天）。
 * - daily   → 明天
 * - weekly  → 下周一
 * - monthly → 下月 1 号
 * 若 baseDate 已过期（早于今天），从今天起算，避免补出一串过期的历史实例。
 */
export function nextOccurrence(
  recurrence: 'daily' | 'weekly' | 'monthly',
  baseDate?: string
): string {
  const today = todayStr();
  const anchor = baseDate && baseDate > today ? baseDate : today;

  if (recurrence === 'daily') {
    return addDaysStr(anchor, 1);
  }

  if (recurrence === 'weekly') {
    const d = parseDateStr(anchor);
    const dow = d.getDay();
    const daysUntilMonday = dow === 1 ? 7 : (8 - dow) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return toDateStr(d);
  }

  // monthly → 下个月 1 号
  const d = parseDateStr(anchor);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}
