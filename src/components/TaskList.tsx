import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import TaskNode from './TaskNode';

interface TaskListProps {
  onEdit: (id: string) => void;
}

export default function TaskList({ onEdit }: TaskListProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const moveTask = useTaskStore((s) => s.moveTask);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const rootTasks = tasks
    .filter((t) => !t.parentId)
    .filter((t) => showCompleted || t.status !== 'done')
    .sort((a, b) => {
      const order = { in_progress: 0, todo: 1, done: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.createdAt - a.createdAt;
    });

  const totalAll = tasks.filter((t) => !t.parentId).length;
  const doneAll = tasks.filter((t) => !t.parentId && t.status === 'done').length;
  const inProgress = tasks.filter((t) => !t.parentId && t.status === 'in_progress').length;
  const todo = tasks.filter((t) => !t.parentId && t.status === 'todo').length;

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);
    const taskId = e.dataTransfer.getData('task/id');
    if (taskId) moveTask(taskId, undefined);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center anim-fade-in">
        <div className="w-[4.5rem] h-[4.5rem] mb-6 opacity-[0.15]">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M16 9C13 6 6 6.5 6 12.5C6.5 16 11 15 16 12" fill="#7C3AED" />
            <path d="M16 9C19 6 26 6.5 26 12.5C25.5 16 21 15 16 12" fill="#EC4899" />
            <path d="M16 13.5C14 16.5 8 19 8.5 16C9 14.5 13 13.5 16 13.5" fill="#7C3AED" opacity="0.5" />
            <path d="M16 13.5C18 16.5 24 19 23.5 16C23 14.5 19 13.5 16 13.5" fill="#EC4899" opacity="0.5" />
            <ellipse cx="16" cy="11" rx="1.2" ry="5.5" fill="#5B5876" />
            <path d="M15 7 Q13 4 12.5 3.5" stroke="#5B5876" strokeWidth="0.8" strokeLinecap="round" fill="none" />
            <circle cx="12.5" cy="3.5" r="0.8" fill="#7C3AED" opacity="0.6" />
            <path d="M17 7 Q19 4 19.5 3.5" stroke="#5B5876" strokeWidth="0.8" strokeLinecap="round" fill="none" />
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
      {/* Stats bar — warm dots */}
      <div className="flex items-center gap-3 mb-4 px-1 shrink-0">
        <span className="text-xs text-violet-400 font-semibold">
          共 {totalAll} 项
        </span>
        <div className="h-[0.9rem] w-px bg-violet-100/40" />
        {todo > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-violet-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-200" />
            {todo} 待办
          </span>
        )}
        {inProgress > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            {inProgress} 进行中
          </span>
        )}
        {doneAll > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-pink-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            {doneAll} 已完成
          </span>
        )}
        {!showCompleted && doneAll > 0 && (
          <span className="text-xs text-violet-200">(已隐藏 {doneAll} 项已完成)</span>
        )}
      </div>

      {/* Section label — warm */}
      <div className="flex items-center gap-2.5 mb-3.5 px-1 shrink-0">
        <svg className="w-[1rem] h-[1rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">任务列表</h3>
        <div className="h-[0.9rem] w-px bg-violet-100/40" />
        <span className="text-xs text-violet-300 font-medium">
          拖拽任务可嵌套为子任务
        </span>
      </div>

      {/* Task list — scrollable, warm drag-over ring */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 transition-all duration-200 ${
          dragOverRoot ? 'ring-2 ring-violet-200 ring-offset-4 rounded-[20px]' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOverRoot(true); }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={handleRootDrop}
      >
        {rootTasks.map((task) => (
          <TaskNode key={task.id} task={task} depth={0} allTasks={tasks} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
