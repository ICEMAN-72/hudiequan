import { useState, useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../types';
import { getQuadrant, QUADRANT_CONFIG, taskOnDate } from '../types';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Calendar() {
  const tasks = useTaskStore((s) => s.tasks);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const datedTasks = useMemo(
    () => tasks.filter((t) => !t.isTrashed && !t.parentId && t.dateType && t.dateType !== 'none' && t.startDate && (showCompleted || t.status !== 'done')),
    [tasks, showCompleted]
  );

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null); // 6 rows

  const today = todayStr();

  const getTasksForDay = (day: number): Task[] => {
    const dateStr = toDateStr(year, month, day);
    return datedTasks.filter((t) => taskOnDate(t, dateStr));
  };

  // Hovered day info
  let hoveredDayNum: number | null = null;
  let hoveredTasks: Task[] = [];
  if (hoveredDate) {
    const parts = hoveredDate.split('-');
    hoveredDayNum = parseInt(parts[2]);
    hoveredTasks = getTasksForDay(hoveredDayNum);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-sm rounded-[20px] shadow-warm p-5 overflow-hidden dew-highlight">
      {/* Calendar header — warm */}
      <div className="flex items-center justify-between mb-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg className="w-[1.2rem] h-[1.2rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
          </svg>
          <h3 className="text-sm font-bold text-violet-800">
            {year}年{month + 1}月
          </h3>
          <button
            onClick={goToday}
            className="text-xs text-violet-500 hover:text-violet-700 font-semibold px-3 py-1.5 rounded-full hover:bg-violet-50/40 transition-colors"
          >
            今天
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="w-[2rem] h-[2rem] flex items-center justify-center rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/40 transition-colors"
          >
            <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="w-[2rem] h-[2rem] flex items-center justify-center rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/40 transition-colors"
          >
            <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info bar — hovered day details, warm */}
      <div className="min-h-[2.2rem] mb-2.5 px-1 shrink-0 flex items-center">
        {hoveredDate && hoveredTasks.length > 0 ? (
          <div className="flex items-center gap-2.5 flex-wrap anim-fade-in">
            <span className="text-xs text-violet-500 font-semibold shrink-0">
              {month + 1}月{hoveredDayNum}日 · {hoveredTasks.length}项
            </span>
            <div className="h-[0.9rem] w-px bg-violet-100/40" />
            {hoveredTasks.map((t) => {
              const q = getQuadrant(t);
              const config = QUADRANT_CONFIG[q];
              return (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 text-xs text-violet-700 max-w-[8rem] truncate"
                >
                  <span
                    className="w-2.5 h-2.5 shrink-0"
                    style={{
                      background: config.accent,
                      borderRadius: t.dateType === 'range' ? '4px' : '50%',
                      boxShadow: `0 0 4px ${config.accent}44`,
                    }}
                  />
                  <span className="truncate">{t.title}</span>
                </span>
              );
            })}
          </div>
        ) : hoveredDate ? (
          <span className="text-xs text-violet-200">
            {month + 1}月{hoveredDayNum}日 · 无任务
          </span>
        ) : (
          <span className="text-xs text-violet-200">悬停日期查看任务详情</span>
        )}
      </div>

      {/* Weekday headers — warm, pink for weekends */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5 shrink-0">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-semibold py-1.5 ${i >= 5 ? 'text-pink-300' : 'text-violet-400'}`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid — warm rounded cells */}
      <div
        className="flex-1 min-h-0 grid grid-cols-7 gap-1.5"
        style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
      >
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="rounded-[10px]" />;
          }

          const dateStr = toDateStr(year, month, day);
          const dayTasks = getTasksForDay(day);
          const isToday = dateStr === today;
          const isHovered = dateStr === hoveredDate;
          const weekday = i % 7;

          const pointTasks = dayTasks.filter((t) => t.dateType === 'point');
          const rangeTasks = dayTasks.filter((t) => t.dateType === 'range');

          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`relative rounded-[10px] transition-all duration-200 flex flex-col items-center justify-start pt-2 pb-1.5 ${
                isToday
                  ? 'bg-violet-100/60 ring-1 ring-violet-300/40'
                  : isHovered && dayTasks.length > 0
                  ? 'bg-violet-50/40'
                  : 'hover:bg-violet-50/20'
              }`}
            >
              {/* Day number */}
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isToday
                    ? 'text-violet-700'
                    : weekday >= 5
                    ? 'text-pink-400'
                    : 'text-violet-600'
                }`}
              >
                {day}
              </span>

              {/* Point task dots — with glow */}
              {pointTasks.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-1 px-1">
                  {pointTasks.slice(0, 4).map((t) => {
                    const q = getQuadrant(t);
                    return (
                      <span
                        key={t.id}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: QUADRANT_CONFIG[q].accent,
                          boxShadow: `0 0 3px ${QUADRANT_CONFIG[q].accent}44`,
                        }}
                      />
                    );
                  })}
                  {pointTasks.length > 4 && (
                    <span className="text-[0.5rem] text-violet-400 leading-none">
                      +{pointTasks.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Range task bars — warm colored */}
              {rangeTasks.length > 0 && (
                <div className="flex flex-col gap-[3px] w-full mt-auto px-1.5">
                  {rangeTasks.slice(0, 2).map((t) => {
                    const q = getQuadrant(t);
                    const config = QUADRANT_CONFIG[q];
                    const isStart = t.startDate === dateStr;
                    const isEnd = t.endDate === dateStr;
                    return (
                      <div
                        key={t.id}
                        className="h-[4px]"
                        style={{
                          background: config.accent,
                          opacity: 0.5,
                          marginLeft: isStart ? 2 : 0,
                          marginRight: isEnd ? 2 : 0,
                          borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend — warm */}
      <div className="flex items-center gap-3.5 mt-3 pt-2.5 border-t border-violet-50/40 shrink-0">
        {(['do', 'schedule', 'delegate', 'eliminate'] as const).map((q) => {
          const config = QUADRANT_CONFIG[q];
          return (
            <div key={q} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: config.accent }} />
              <span className="text-xs text-violet-400">{config.label}</span>
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="text-xs text-violet-400">时间点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-[0.85rem] h-[4px] rounded-full bg-violet-400" />
            <span className="text-xs text-violet-400">时间段</span>
          </div>
        </div>
      </div>
    </div>
  );
}
