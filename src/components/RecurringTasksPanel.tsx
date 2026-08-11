import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import TaskNode from './TaskNode';

interface RecurringTasksPanelProps {
  onEdit: (id: string) => void;
  onCreateRecurring: () => void;
}

export default function RecurringTasksPanel({ onEdit, onCreateRecurring }: RecurringTasksPanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const addSubTask = useTaskStore((s) => s.addSubTask);

  const [addSubId, setAddSubId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');

  const recurringTasks = tasks.filter((t) => !t.isTrashed && !t.parentId && t.recurrence && t.recurrence !== 'none' && t.status !== 'done');

  const REC_LABELS: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' };

  return (
    <div className="h-full flex flex-col anim-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg className="w-[1rem] h-[1rem] text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="text-sm font-bold text-teal-700">周期任务</h3>
          <span className="text-xs text-teal-300">{recurringTasks.length}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
        {recurringTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-8 h-8 text-teal-200 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-xs text-teal-200">暂无周期任务</p>
            <button onClick={onCreateRecurring} className="mt-2 text-xs text-teal-400 hover:text-teal-600 transition-colors">
              + 新建周期任务
            </button>
          </div>
        ) : (
          recurringTasks.map((task) => (
            <div key={task.id} className="space-y-2">
              <div className="group flex items-center gap-3 px-4 py-3 bg-white/70 rounded-[14px] shadow-warm hover:shadow-warm-hover transition-all duration-200">
                {/* Status */}
                <button onClick={() => cycleStatus(task.id)}
                  className="relative w-[1.1rem] h-[1.1rem] rounded-full shrink-0 transition-all duration-200 active:scale-90"
                  style={task.status === 'todo' ? { border: '2px solid #C4B5FD', background: 'transparent' }
                    : task.status === 'in_progress' ? { border: '2px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 4px rgba(124,58,237,0.15)' }
                    : {}}>
                  {task.status === 'in_progress' && (
                    <svg className="absolute inset-0 m-auto w-[0.5rem] h-[0.5rem] text-violet-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 010 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 016 6h-6V6z" /></svg>
                  )}
                </button>

                {/* Title */}
                <span className="flex-1 text-sm text-violet-800 truncate cursor-pointer" onClick={() => onEdit(task.id)}>
                  {task.title}
                </span>

                {/* Recurrence badge */}
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium shrink-0">
                  {REC_LABELS[task.recurrence || 'daily']}
                </span>

                {/* Edit + Add sub + Delete */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setAddSubId(task.id); setSubTitle(''); }}
                    className="p-1.5 rounded-full text-violet-300 hover:text-teal-600 hover:bg-teal-50/60 transition-colors"
                    title="添加子任务">
                    <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button onClick={() => onEdit(task.id)}
                    className="p-1.5 rounded-full text-violet-300 hover:text-pink-600 hover:bg-pink-50/60 transition-colors">
                    <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-full text-violet-300 hover:text-red-400 hover:bg-red-50/60 transition-colors">
                    <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Inline sub-task input */}
              {addSubId === task.id && (
                <div className="ml-6 py-1 anim-slide-up">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-[12px] border border-teal-100/40">
                    <div className="w-[0.9rem] h-[0.9rem] rounded-full border-2 border-teal-200 shrink-0" />
                    <input autoFocus value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && subTitle.trim()) { addSubTask(task.id, subTitle.trim()); setAddSubId(null); setSubTitle(''); }
                        if (e.key === 'Escape') { setAddSubId(null); setSubTitle(''); }
                      }}
                      onBlur={() => { if (subTitle.trim()) addSubTask(task.id, subTitle.trim()); setAddSubId(null); setSubTitle(''); }}
                      placeholder="子任务名称…" className="flex-1 text-xs text-violet-900 placeholder:text-violet-200 bg-transparent outline-none" />
                  </div>
                </div>
              )}
              {/* Sub-tasks for this recurring task */}
              {tasks.filter((t) => t.parentId === task.id && !t.isTrashed && t.status !== 'done').length > 0 && (
                <div className="ml-6 space-y-1.5">
                  {tasks.filter((t) => t.parentId === task.id && !t.isTrashed && t.status !== 'done')
                    .sort((a, b) => {
                      const o: Record<string, number> = { in_progress: 0, todo: 1, done: 2 };
                      return (o[a.status] || 1) - (o[b.status] || 1);
                    })
                    .map((child) => (
                      <TaskNode key={child.id} task={child} depth={0} allTasks={tasks.filter(t => !t.isTrashed)} onEdit={onEdit} />
                    ))
                  }
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
