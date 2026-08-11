import { useState, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../types';
import { getQuadrant, QUADRANT_CONFIG, taskOnDate } from '../types';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
type ViewMode = 'month' | 'week' | 'day';

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function todayStr(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}
function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  return m;
}

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
    () => tasks.filter((t) => !t.isTrashed && !t.parentId && t.dateType && t.dateType !== 'none' && t.startDate && (showCompleted || t.status !== 'done')),
    [tasks, showCompleted]
  );

  const getTasksForDay = (dateStr: string): Task[] => datedTasks.filter((t) => taskOnDate(t, dateStr));

  const prev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const next = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Title
  const title = view === 'month' ? `${year}年${month + 1}月`
    : view === 'week' ? (() => {
        const monday = getMonday(currentDate);
        const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
        const sm = monday.getMonth(), sy = monday.getFullYear();
        const em = sunday.getMonth(), ey = sunday.getFullYear();
        if (sy === ey) return sy === year ? `${monday.getDate()}日 - ${sunday.getDate()}日` : `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`;
        return `${sy}/${sm + 1}/${monday.getDate()} - ${ey}/${em + 1}/${sunday.getDate()}`;
      })()
    : `${year}年${month + 1}月${currentDate.getDate()}日`;

  // Month view data
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-sm rounded-[20px] shadow-warm p-5 overflow-hidden dew-highlight">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg className="w-[1.2rem] h-[1.2rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <h3 className="text-sm font-bold text-violet-800">{title}</h3>
          <button onClick={goToday} className="text-xs text-violet-500 hover:text-violet-700 font-semibold px-3 py-1.5 rounded-full hover:bg-violet-50/40">今天</button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-violet-50/40 rounded-full p-0.5 mr-2">
            {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${view === v ? 'bg-white text-violet-700 shadow-warm' : 'text-violet-400 hover:text-violet-600'}`}>
                {{ month: '月', week: '周', day: '日' }[v]}
              </button>
            ))}
          </div>
          <button onClick={prev} className="w-[2rem] h-[2rem] flex items-center justify-center rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/40">
            <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={next} className="w-[2rem] h-[2rem] flex items-center justify-center rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/40">
            <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* Day View */}
      {view === 'day' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
          {Array.from({ length: 24 }, (_, h) => {
            const ds = toDateStr(year, month, currentDate.getDate());
            const hourTasks = datedTasks.filter((t) => t.dateType === 'point' && t.startDate === ds);
            const isNow = new Date().getHours() === h;
            return (
              <div key={h} className={`flex items-start gap-2 py-1 px-2 rounded-[8px] ${isNow ? 'bg-violet-50/40' : ''}`}>
                <span className="text-[10px] text-violet-400 w-8 text-right tabular-nums shrink-0">{String(h).padStart(2, '0')}:00</span>
                <div className="flex-1 min-w-0">{hourTasks.length > 0 ? hourTasks.map((t) => (
                  <div key={t.id} className="text-[11px] text-violet-700 truncate py-0.5">{t.title}</div>
                )) : <div className="h-[1rem]" />}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="flex-1 min-h-0 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const monday = getMonday(currentDate);
            const d = new Date(monday); d.setDate(d.getDate() + i);
            const ds = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
            const dayTasks = datedTasks.filter((t) => taskOnDate(t, ds));
            const isToday = ds === today;
            return (
              <div key={i} className={`flex flex-col rounded-[10px] p-1 ${isToday ? 'bg-violet-50/40 ring-1 ring-violet-200/30' : ''}`}>
                <div className="text-center mb-1">
                  <span className="text-[9px] text-violet-400">{WEEKDAYS[i]}</span>
                  <div className={`text-xs font-bold ${isToday ? 'text-violet-700' : 'text-violet-600'}`}>{d.getDate()}</div>
                </div>
                <div className="flex-1 space-y-0.5 overflow-y-auto min-h-0">
                  {dayTasks.slice(0, 8).map((t) => (
                    <div key={t.id} className="text-[9px] text-violet-600 truncate px-1 py-0.5 rounded bg-white/50">{t.title}</div>
                  ))}
                  {dayTasks.length > 8 && <div className="text-[9px] text-violet-300 px-1">+{dayTasks.length - 8}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5 shrink-0">
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} className={`text-center text-xs font-semibold py-1.5 ${i >= 5 ? 'text-pink-300' : 'text-violet-400'}`}>{wd}</div>
            ))}
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-7 gap-1.5" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="rounded-[10px]" />;
              const dateStr = toDateStr(year, month, day);
              const dayTasks = getTasksForDay(dateStr);
              const isToday = dateStr === today;
              const isHovered = dateStr === hoveredDate;
              return (
                <div key={i} onMouseEnter={() => setHoveredDate(dateStr)} onMouseLeave={() => setHoveredDate(null)}
                  className={`relative rounded-[10px] transition-all duration-200 flex flex-col items-center justify-start pt-2 pb-1.5 ${isToday ? 'bg-violet-100/60 ring-1 ring-violet-300/40' : isHovered && dayTasks.length > 0 ? 'bg-violet-50/40' : 'hover:bg-violet-50/20'}`}>
                  <span className={`text-xs font-semibold tabular-nums ${isToday ? 'text-violet-700' : i % 7 >= 5 ? 'text-pink-400' : 'text-violet-600'}`}>{day}</span>
                  {dayTasks.filter((t) => t.dateType === 'point').slice(0, 4).map((t) => (
                    <span key={t.id} className="w-2 h-2 rounded-full mt-1" style={{ background: QUADRANT_CONFIG[getQuadrant(t)].accent, boxShadow: `0 0 2px ${QUADRANT_CONFIG[getQuadrant(t)].accent}44` }} />
                  ))}
                  {dayTasks.filter((t) => t.dateType === 'point').length > 4 && <span className="text-[0.5rem] text-violet-400 mt-0.5">+{dayTasks.filter((t) => t.dateType === 'point').length - 4}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3.5 mt-3 pt-2.5 border-t border-violet-50/40 shrink-0">
            {(['do', 'schedule', 'delegate', 'eliminate'] as const).map((q) => (
              <div key={q} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: QUADRANT_CONFIG[q].accent }} /><span className="text-xs text-violet-400">{QUADRANT_CONFIG[q].label}</span></div>
            ))}
            <div className="ml-auto flex items-center gap-3.5">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" /><span className="text-xs text-violet-400">时间点</span></div>
              <div className="flex items-center gap-1.5"><span className="w-[0.85rem] h-[4px] rounded-full bg-violet-400" /><span className="text-xs text-violet-400">时间段</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
