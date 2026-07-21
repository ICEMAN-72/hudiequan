import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task, SortOption } from '../types';
import TaskNode from './TaskNode';

interface TaskListProps {
  onEdit: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  default: '默认',
  status: '按状态',
  created: '按时间',
  children: '子任务数',
};

const SORT_OPTIONS: SortOption[] = ['default', 'status', 'created', 'children'];

function sortRootTasks(tasks: Task[], sortBy: SortOption): Task[] {
  const roots = tasks.filter((t) => !t.parentId && !t.isTrashed);
  switch (sortBy) {
    case 'status': {
      const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
      return [...roots].sort((a, b) => order[a.status] !== order[b.status] ? order[a.status] - order[b.status] : b.createdAt - a.createdAt);
    }
    case 'created':
      return [...roots].sort((a, b) => b.createdAt - a.createdAt);
    case 'children': {
      const all = tasks.filter((t) => !t.isTrashed);
      return [...roots].sort((a, b) => all.filter((t) => t.parentId === b.id).length - all.filter((t) => t.parentId === a.id).length);
    }
    default: {
      const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
      return [...roots].sort((a, b) => order[a.status] !== order[b.status] ? order[a.status] - order[b.status] : b.createdAt - a.createdAt);
    }
  }
}

function matchesQuery(task: Task, query: string, allTasks: Task[]): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (task.title.toLowerCase().includes(q)) return true;
  // Also search children
  const children = allTasks.filter((t) => t.parentId === task.id && !t.isTrashed);
  return children.some((c) => c.title.toLowerCase().includes(q));
}

export default function TaskList({ onEdit, searchQuery, onSearchChange, selectedIds, onToggleSelect }: TaskListProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const sortBy = useTaskStore((s) => s.sortBy);
  const setSortBy = useTaskStore((s) => s.setSortBy);
  const moveTask = useTaskStore((s) => s.moveTask);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const activeTasks = tasks.filter((t) => !t.isTrashed);
  const sortedRoots = sortRootTasks(activeTasks, sortBy);
  const filteredRoots = sortedRoots.filter((t) =>
    (showCompleted || t.status !== 'done') && matchesQuery(t, searchQuery, activeTasks)
  );

  const totalAll = sortedRoots.length;
  const doneAll = sortedRoots.filter((t) => t.status === 'done').length;
  const inProgress = sortedRoots.filter((t) => t.status === 'in_progress').length;
  const todo = sortedRoots.filter((t) => t.status === 'todo').length;

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOverRoot(false);
    const taskId = e.dataTransfer.getData('task/id');
    if (taskId) moveTask(taskId, undefined);
  };

  if (activeTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center anim-fade-in">
        <div className="w-[4.5rem] h-[4.5rem] mb-6 opacity-[0.15]">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M16 9C13 6 6 6.5 6 12.5C6.5 16 11 15 16 12" fill="#7C3AED" />
            <path d="M16 9C19 6 26 6.5 26 12.5C25.5 16 21 15 16 12" fill="#EC4899" />
            <path d="M16 13.5C14 16.5 8 19 8.5 16C9 14.5 13 13.5 16 13.5" fill="#7C3AED" opacity="0.5" />
            <path d="M16 13.5C18 16.5 24 19 23.5 16C23 14.5 19 13.5 16 13.5" fill="#EC4899" opacity="0.5" />
            <ellipse cx="16" cy="11" rx="1.2" ry="5.5" fill="#5B5876" />
            <path d="M15 7 Q13 4 12.5 3.5" stroke="#5B5876" strokeWidth="0.8" fill="none" />
            <circle cx="12.5" cy="3.5" r="0.8" fill="#7C3AED" opacity="0.6" />
            <path d="M17 7 Q19 4 19.5 3.5" stroke="#5B5876" strokeWidth="0.8" fill="none" />
            <circle cx="19.5" cy="3.5" r="0.8" fill="#EC4899" opacity="0.6" />
          </svg>
        </div>
        <p className="text-sm text-violet-400 font-semibold mb-1.5">还没有任务</p>
        <p className="text-xs text-violet-200">点击左下角按钮添加任务</p>
      </div>
    );
  }

  return (
    <div className="anim-slide-up h-full flex flex-col">
      {/* Section label */}
      <div className="flex items-center gap-2.5 mb-3.5 px-1 shrink-0">
        <svg className="w-[1rem] h-[1rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">任务列表</h3>
        <div className="h-[0.9rem] w-px bg-violet-100/40" />
        <span className="text-xs text-violet-300 font-medium">拖拽任务可嵌套为子任务</span>
      </div>

      {/* Stats + Search — taller row */}
      <div className="flex items-center justify-between mb-4 px-1 shrink-0 gap-4" style={{ minHeight: '2.5rem' }}>
        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-violet-400 font-semibold">共 {totalAll} 项</span>
          {todo > 0 && <span className="flex items-center gap-1.5 text-xs text-violet-500 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-violet-200" />{todo}</span>}
          {inProgress > 0 && <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />{inProgress}</span>}
          {doneAll > 0 && <span className="flex items-center gap-1.5 text-xs text-pink-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" />{doneAll}</span>}
        </div>

        {/* Search bar — icon on left, outside input */}
        <div className="flex-1 max-w-[18rem] flex items-center gap-2 bg-violet-50/40 rounded-full px-3 py-2.5 border border-transparent focus-within:border-violet-200 focus-within:bg-white transition-all">
          <svg className="w-[1rem] h-[1rem] text-violet-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索任务…"
            className="flex-1 bg-transparent text-xs text-violet-900 placeholder:text-violet-300 outline-none min-w-0"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="text-violet-300 hover:text-violet-500 shrink-0">
              <svg className="w-[0.75rem] h-[0.75rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <button onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-colors">
            <svg className="w-[0.9rem] h-[0.9rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {SORT_LABELS[sortBy]}
          </button>
          {showSort && (
            <div className="absolute right-0 top-10 z-20 bg-white/95 backdrop-blur-sm rounded-[14px] shadow-warm-xl p-1.5 min-w-[7rem] anim-scale-in" onClick={() => setShowSort(false)}>
              {SORT_OPTIONS.map((opt) => (
                <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); }}
                  className={`w-full text-left px-3 py-2 rounded-[10px] text-xs font-medium transition-colors ${sortBy === opt ? 'bg-violet-50 text-violet-700' : 'text-violet-500 hover:bg-violet-50/50'}`}>
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          )}
          {showSort && <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />}
        </div>
      </div>

      {/* Task list */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 transition-all duration-200 ${dragOverRoot ? 'ring-2 ring-violet-200 ring-offset-4 rounded-[20px]' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOverRoot(true); }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={handleRootDrop}
      >
        {filteredRoots.map((task) => (
          <TaskNode key={task.id} task={task} depth={0} allTasks={activeTasks} onEdit={onEdit} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        ))}
        {filteredRoots.length === 0 && searchQuery && (
          <p className="text-sm text-violet-200 text-center py-12">没有找到匹配的任务</p>
        )}
      </div>
    </div>
  );
}
