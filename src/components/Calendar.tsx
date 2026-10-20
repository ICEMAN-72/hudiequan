import { useState, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../types';
import { getQuadrant, QUADRANT_CONFIG, taskOnDate, formatDateDisplay } from '../types';
import { toDateStr, todayStr, parseDateStr, startOfWeekStr } from '../lib/date';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const VIEW_LABEL: Record<ViewMode, string> = { month: '月', week: '周', day: '日' };
type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
  const tasks = useTaskStore((s) => s.tasks);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = todayStr();

  const datedTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.isTrashed &&
          !t.parentId &&
          t.dateType &&
          t.dateType !== 'none' &&
          t.startDate &&
          (showCompleted || t.status !== 'done')
      ),
    [tasks, showCompleted]
  );

  const tasksForDay = (dateStr: string): Task[] => datedTasks.filter((t) => taskOnDate(t, dateStr));

  const step = (delta: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + delta);
    else if (view === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const title = (() => {
    if (view === 'month') return `${year}年${month + 1}月`;
    if (view === 'day') return `${year}年${month + 1}月${currentDate.getDate()}日`;
    const monday = startOfWeekStr(toDateStr(currentDate));
    const sunday = toDateStr(new Date(parseDateStr(monday).getTime() + 6 * 86400000));
    const [, mm, md] = monday.split('-').map(Number);
    const [, em, ed] = sunday.split('-').map(Number);
    return `${mm}月${md}日 – ${em}月${ed}日`;
  })();

  // 月视图网格
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const currentDayStr = toDateStr(currentDate);
  const dayTaskList = view === 'day' ? tasksForDay(currentDayStr) : [];

  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-sm rounded-[20px] shadow-warm p-5 overflow-hidden dew-highlight surface-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg className="w-[1.15rem] h-[1.15rem] text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <h3 className="fs-sm font-bold text-violet-800 truncate">{title}</h3>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="fs-xs text-violet-500 hover:text-violet-700 font-semibold px-2.5 py-1 rounded-full hover:bg-violet-50/40 transition-colors shrink-0"
          >
            今天
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-violet-50/50 rounded-full p-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-0.5 rounded-full fs-xs font-semibold transition-all duration-200 ${
                  view === v ? 'bg-white text-violet-700 shadow-warm' : 'text-violet-400 hover:text-violet-600'
                }`}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          <button onClick={() => step(-1)} aria-label="上一个周期" className="icon-btn w-[1.9rem] h-[1.9rem]">
            <svg className="w-[0.95rem] h-[0.95rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={() => step(1)} aria-label="下一个周期" className="icon-btn w-[1.9rem] h-[1.9rem]">
            <svg className="w-[0.95rem] h-[0.95rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* 日视图 —— 当日任务清单（按时间属性排序，不再假造 24 小时轴） */}
      {view === 'day' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-3 pb-2.5 mb-1 border-b border-violet-50/60 shrink-0">
            <span className="fs-xs text-violet-400">
              {dayTaskList.length === 0
                ? '这一天没有安排'
                : `${dayTaskList.length} 个安排 · 已完成 ${dayTaskList.filter((t) => t.status === 'done').length}`}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin space-y-1.5 pt-2 pr-1">
            {dayTaskList.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-1.5 py-8">
                <div className="w-10 h-10 rounded-full bg-violet-50/60 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6" /><circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                <p className="fs-xs text-violet-300">空着的一天，挺好</p>
              </div>
            )}
            {dayTaskList.map((t) => {
              const q = QUADRANT_CONFIG[getQuadrant(t)];
              const isRange = t.dateType === 'range' && t.endDate;
              const spanDays = isRange && t.startDate ? Math.round((parseDateStr(t.endDate!).getTime() - parseDateStr(t.startDate!).getTime()) / 86400000) + 1 : 1;
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-[12px] bg-white/70 hover:bg-white transition-all duration-200 ${
                    t.status === 'done' ? 'opacity-50' : ''
                  }`}
                >
                  <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: q.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className={`fs-xs font-semibold text-violet-800 truncate ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</p>
                    <p className="fs-2xs text-violet-400 mt-0.5">
                      {isRange
                        ? `${formatDateDisplay(t.startDate!)} – ${formatDateDisplay(t.endDate!)} · 共 ${spanDays} 天`
                        : '当天'}
                      {t.status === 'in_progress' && <span className="ml-1.5 text-violet-500">· 进行中</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 周视图 */}
      {view === 'week' && (
        <div className="flex-1 min-h-0 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const monday = startOfWeekStr(toDateStr(currentDate));
            const ds = toDateStr(new Date(parseDateStr(monday).getTime() + i * 86400000));
            const d = parseDateStr(ds);
            const dayTasks = tasksForDay(ds);
            const isToday = ds === today;
            return (
              <div
                key={i}
                className={`flex flex-col rounded-[12px] p-1.5 min-w-0 transition-colors duration-200 ${
                  isToday ? 'bg-violet-50/60 ring-1 ring-violet-200/40' : 'hover:bg-violet-50/20'
                }`}
              >
                <div className="text-center mb-1.5 shrink-0">
                  <span className="fs-2xs text-violet-400">{WEEKDAYS[i]}</span>
                  <div className={`fs-xs font-bold tabular-nums ${isToday ? 'text-violet-700' : 'text-violet-600'}`}>{d.getDate()}</div>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto scroll-thin min-h-0">
                  {dayTasks.map((t) => {
                    const q = QUADRANT_CONFIG[getQuadrant(t)];
                    return (
                      <div
                        key={t.id}
                        className={`fs-2xs leading-tight px-1.5 py-1 rounded-[6px] truncate transition-opacity ${
                          t.status === 'done' ? 'opacity-45' : ''
                        }`}
                        style={{ background: q.accentLight, color: q.accent }}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 月视图 */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-1.5 mb-1 shrink-0">
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} className={`text-center fs-xs font-semibold py-1 ${i >= 5 ? 'text-pink-300' : 'text-violet-400'}`}>{wd}</div>
            ))}
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-7 gap-1.5" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="rounded-[10px]" />;
              const dateStr = toDateStr(new Date(year, month, day));
              const dayTasks = tasksForDay(dateStr);
              const points = dayTasks.filter((t) => t.dateType === 'point');
              const ranges = dayTasks.filter((t) => t.dateType === 'range');
              const isToday = dateStr === today;
              const isHovered = dateStr === hoveredDate;
              const hasAny = dayTasks.length > 0;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  title={hasAny ? dayTasks.map((t) => t.title).join(' · ') : undefined}
                  className={`relative rounded-[10px] transition-all duration-200 flex flex-col items-center justify-start pt-1.5 pb-1 px-1 overflow-hidden ${
                    isToday
                      ? 'bg-violet-100/70 ring-1 ring-violet-300/50'
                      : isHovered && hasAny
                      ? 'bg-violet-50/50'
                      : 'hover:bg-violet-50/25'
                  }`}
                >
                  <span className={`fs-xs font-semibold tabular-nums shrink-0 ${isToday ? 'text-violet-700' : i % 7 >= 5 ? 'text-pink-400' : 'text-violet-600'}`}>
                    {day}
                  </span>

                  {/* 时间段：细横条，首尾各自圆角，视觉上连成一段 */}
                  {ranges.slice(0, 2).map((t) => {
                    const q = QUADRANT_CONFIG[getQuadrant(t)];
                    const isStart = t.startDate === dateStr;
                    const isEnd = t.endDate === dateStr;
                    return (
                      <span
                        key={t.id}
                        className="h-[3px] w-full mt-1 shrink-0"
                        style={{
                          background: q.accent,
                          opacity: 0.85,
                          borderTopLeftRadius: isStart ? 2 : 0,
                          borderBottomLeftRadius: isStart ? 2 : 0,
                          borderTopRightRadius: isEnd ? 2 : 0,
                          borderBottomRightRadius: isEnd ? 2 : 0,
                        }}
                      />
                    );
                  })}

                  {/* 时间点：圆点 */}
                  {points.length > 0 && (
                    <div className="flex items-center gap-[3px] mt-1 flex-wrap justify-center shrink-0">
                      {points.slice(0, 4).map((t) => {
                        const q = QUADRANT_CONFIG[getQuadrant(t)];
                        return (
                          <span
                            key={t.id}
                            className="w-[5px] h-[5px] rounded-full"
                            style={{ background: q.accent, boxShadow: `0 0 3px ${q.accent}66` }}
                          />
                        );
                      })}
                      {points.length > 4 && <span className="fs-2xs text-violet-400 leading-none">+{points.length - 4}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-violet-50/60 shrink-0 flex-wrap">
            {(['do', 'schedule', 'delegate', 'eliminate'] as const).map((q) => (
              <div key={q} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: QUADRANT_CONFIG[q].accent }} />
                <span className="fs-2xs text-violet-400">{QUADRANT_CONFIG[q].label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-400" /><span className="fs-2xs text-violet-400">时间点</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-violet-400" /><span className="fs-2xs text-violet-400">时间段</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
