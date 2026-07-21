import { useState, useEffect, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Quadrant, DateType, Task } from '../types';
import { QUADRANT_CONFIG } from '../types';

interface NewTaskFormProps {
  editingTaskId: string | null;
  onDone: () => void;
}

const QUADRANT_VALUES: Record<Quadrant, { urgency: 'high' | 'low'; importance: 'high' | 'low' }> = {
  do: { urgency: 'high', importance: 'high' },
  schedule: { urgency: 'low', importance: 'high' },
  delegate: { urgency: 'high', importance: 'low' },
  eliminate: { urgency: 'low', importance: 'low' },
};

const GRID: Quadrant[][] = [
  ['schedule', 'do'],
  ['eliminate', 'delegate'],
];

function getQuadrantFromTask(urgency: 'high' | 'low', importance: 'high' | 'low'): Quadrant {
  if (urgency === 'high' && importance === 'high') return 'do';
  if (urgency === 'low' && importance === 'high') return 'schedule';
  if (urgency === 'high' && importance === 'low') return 'delegate';
  return 'eliminate';
}

const DATE_OPTIONS: { value: DateType; label: string; icon: string }[] = [
  { value: 'none', label: '不设置', icon: '○' },
  { value: 'point', label: '时间点', icon: '◉' },
  { value: 'range', label: '时间段', icon: '◇' },
];

const QUADRANT_ICONS: Record<Quadrant, string> = {
  do: '🔥',
  schedule: '📅',
  delegate: '👥',
  eliminate: '🗑️',
};

export default function NewTaskForm({ editingTaskId, onDone }: NewTaskFormProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const addSubTask = useTaskStore((s) => s.addSubTask);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;
  const children = editingTaskId ? tasks.filter((t) => t.parentId === editingTaskId && !t.isTrashed) : [];
  const sortedChildren = [...children].sort((a, b) => {
    const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.createdAt - a.createdAt;
  });

  const [title, setTitle] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant>('do');
  const [dateType, setDateType] = useState<DateType>('none');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setSelectedQuadrant(getQuadrantFromTask(editingTask.urgency, editingTask.importance));
      setDateType(editingTask.dateType ?? 'none');
      setStartDate(editingTask.startDate ?? '');
      setEndDate(editingTask.endDate ?? '');
    } else {
      setTitle('');
      setSelectedQuadrant('do');
      setDateType('none');
      setStartDate('');
      setEndDate('');
    }
  }, [editingTask]);

  const canSave = title.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    const { urgency, importance } = QUADRANT_VALUES[selectedQuadrant];
    if (editingTaskId) {
      updateTask(editingTaskId, {
        title: title.trim(),
        urgency,
        importance,
        dateType,
        startDate: dateType !== 'none' ? startDate : undefined,
        endDate: dateType === 'range' ? endDate : undefined,
      });
    } else {
      addTask(title.trim(), urgency, importance, dateType, startDate, endDate);
    }
    setTitle('');
    setSelectedQuadrant('do');
    setDateType('none');
    setStartDate('');
    setEndDate('');
    onDone();
  }, [title, selectedQuadrant, dateType, startDate, endDate, editingTaskId, addTask, updateTask, onDone]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onDone();
    }
  };

  return (
    <div
      className="bg-white/95 backdrop-blur-sm rounded-[28px] shadow-warm-xl flex flex-col h-full anim-scale-in dew-highlight"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-7 pb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}>
            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-violet-900">
            {editingTaskId ? '编辑任务' : '新建任务'}
          </h2>
        </div>
        <button
          onClick={onDone}
          className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-7 pb-5 space-y-24">

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入任务名称…"
          className="w-full px-5 py-4 rounded-[16px] bg-violet-50/30 border-2 border-transparent focus:border-violet-300 focus:bg-white focus:ring-[4px] focus:ring-violet-50 outline-none transition-all text-base text-violet-900 placeholder:text-violet-200"
          autoFocus
        />

        {/* Quadrant card — distinct purple tint background */}
        <div className="rounded-[20px] p-5" style={{ background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.6) 0%, rgba(252, 231, 243, 0.4) 100%)', border: '1.5px solid rgba(196, 181, 253, 0.25)' }}>
          {/* Section title row */}
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-sm font-bold text-violet-800">象限归属</p>
              <p className="text-xs text-violet-400">决定紧急与重要程度</p>
            </div>
          </div>

          {/* 2x2 grid — tall narrow cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {GRID.flat().map((q) => {
              const config = QUADRANT_CONFIG[q];
              const isSelected = selectedQuadrant === q;
              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuadrant(q)}
                  className="text-center px-2 py-4 rounded-[14px] transition-all duration-200"
                  style={isSelected ? {
                    background: config.accentLight,
                    boxShadow: `0 0 0 2px ${config.accent}, 0 4px 14px ${config.accent}26`,
                  } : {
                    background: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 1px 3px rgba(124, 58, 237, 0.05)',
                  }}
                >
                  <div className="text-xl mb-1.5 leading-none">{QUADRANT_ICONS[q]}</div>
                  <div className={`text-sm font-bold mb-0.5 ${isSelected ? config.text : 'text-violet-700'}`}>
                    {config.label}
                  </div>
                  <div className={`text-[11px] leading-tight ${isSelected ? config.text : 'text-violet-400'} opacity-75`}>
                    {config.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module separator — soft dashed divider with floating dot */}
        <div className="flex items-center justify-center gap-2.5 -my-12 opacity-60">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-200 to-violet-200" />
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-violet-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className="w-1 h-1 rounded-full bg-violet-300" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent via-violet-200" />
        </div>

        {/* Time card — distinct pink tint background */}
        <div className="rounded-[20px] p-5" style={{ background: 'linear-gradient(135deg, rgba(252, 231, 243, 0.6) 0%, rgba(254, 215, 226, 0.4) 100%)', border: '1.5px solid rgba(249, 168, 212, 0.3)' }}>
          {/* Section title row */}
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <span className="text-lg">⏰</span>
            <div>
              <p className="text-sm font-bold text-violet-800">时间设置</p>
              <p className="text-xs text-violet-400">为任务添加时间</p>
            </div>
          </div>

          {/* Date type selector — pill buttons */}
          <div className="flex gap-2 mb-4">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateType(opt.value)}
                className={`flex-1 px-2 py-3 rounded-full text-xs font-bold transition-all ${
                  dateType === opt.value
                    ? 'bg-violet-700 text-white shadow-warm-hover'
                    : 'bg-white/80 text-violet-500 hover:bg-white'
                }`}
              >
                <span className="mr-1">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {dateType === 'point' && (
            <div className="anim-fade-in">
              <label className="text-xs text-violet-400 mb-2 block pl-1">选择日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-[14px] bg-white/80 border-2 border-transparent focus:border-violet-300 focus:bg-white focus:ring-[4px] focus:ring-violet-50 outline-none transition-all text-sm text-violet-900"
              />
            </div>
          )}
          {dateType === 'range' && (
            <div className="space-y-3 anim-fade-in">
              <div>
                <label className="text-xs text-violet-400 mb-2 block pl-1">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-[14px] bg-white/80 border-2 border-transparent focus:border-violet-300 focus:bg-white focus:ring-[4px] focus:ring-violet-50 outline-none transition-all text-sm text-violet-900"
                />
              </div>
              <div>
                <label className="text-xs text-violet-400 mb-2 block pl-1">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-[14px] bg-white/80 border-2 border-transparent focus:border-pink-300 focus:bg-white focus:ring-[4px] focus:ring-pink-50 outline-none transition-all text-sm text-violet-900"
                />
              </div>
            </div>
          )}
          {dateType === 'none' && (
            <div className="rounded-[14px] bg-white/70 px-4 py-4 text-center">
              <p className="text-xs text-violet-300">
                此任务暂不设置时间
              </p>
            </div>
          )}
        </div>

        {/* Sub-task management — only when editing */}
        {editingTaskId && (
          <div className="rounded-[20px] p-5" style={{ background: 'linear-gradient(135deg, rgba(237, 233, 254, 0.6) 0%, rgba(224, 231, 255, 0.4) 100%)', border: '1.5px solid rgba(165, 180, 252, 0.3)' }}>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-sm font-bold text-violet-800">子任务管理</p>
                  <p className="text-xs text-violet-400">{children.length} 个子任务</p>
                </div>
              </div>
              <button
                onClick={() => {
                  addSubTask(editingTaskId, '新子任务');
                }}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-violet-600 bg-white/70 hover:bg-white transition-colors"
              >
                + 添加
              </button>
            </div>
            {children.length === 0 ? (
              <div className="rounded-[14px] bg-white/70 px-4 py-4 text-center">
                <p className="text-xs text-violet-300">暂无子任务</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[14rem] overflow-y-auto">
                {sortedChildren.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 bg-white/70 rounded-[12px] group">
                    <button onClick={() => cycleStatus(child.id)}
                      className="relative w-[1rem] h-[1rem] rounded-full shrink-0 transition-all duration-200 active:scale-90"
                      style={child.status === 'todo' ? { border: '2px solid #C4B5FD', background: 'transparent' }
                        : child.status === 'in_progress' ? { border: '2px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 4px rgba(124, 58, 237, 0.15)' }
                        : { border: '2px solid #EC4899', background: '#EC4899', boxShadow: '0 0 4px rgba(236, 72, 153, 0.2)' }
                      }>
                      {child.status === 'done' && (
                        <svg className="absolute inset-0 m-auto w-[0.55rem] h-[0.55rem] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm truncate ${child.status === 'done' ? 'line-through text-violet-300' : 'text-violet-800'}`}>
                      {child.title}
                    </span>
                    <button onClick={() => deleteTask(child.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-300 hover:text-red-400 shrink-0">
                      <svg className="w-[0.9rem] h-[0.9rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="min-h-[1rem]" />
      </div>

      {/* Footer */}
      <div className="px-7 pb-7 pt-4 shrink-0 border-t border-violet-50/50">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-4 rounded-[16px] text-white font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
          style={{
            background: canSave
              ? 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)'
              : '#C4B5FD',
            boxShadow: canSave ? '0 8px 24px rgba(124, 58, 237, 0.22), 0 4px 12px rgba(236, 72, 153, 0.12)' : 'none',
          }}
        >
          {editingTaskId ? '保存修改' : '添加任务'}
        </button>

        <p className="text-xs text-violet-200 text-center mt-3">
          Ctrl + Enter 快速保存 · Esc 关闭
        </p>
      </div>
    </div>
  );
}
