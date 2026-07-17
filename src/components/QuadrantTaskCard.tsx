import type { Task } from '../types';
import { STATUS_CONFIG, formatDateRange } from '../types';

interface QuadrantTaskCardProps {
  task: Task;
  allTasks: Task[];
  onEdit: () => void;
  onCycleStatus: () => void;
}

export default function QuadrantTaskCard({
  task,
  allTasks,
  onEdit,
  onCycleStatus,
}: QuadrantTaskCardProps) {
  const children = allTasks.filter((t) => t.parentId === task.id);
  const isDone = task.status === 'done';
  const hasDate = task.dateType && task.dateType !== 'none' && task.startDate;

  const statusStyles: Record<Task['status'], React.CSSProperties> = {
    todo: {
      border: '2px solid #C4B5FD',
      background: 'transparent',
      boxShadow: 'none',
    },
    in_progress: {
      border: '2px solid #7C3AED',
      background: '#EDE9FE',
      boxShadow: '0 0 6px rgba(124, 58, 237, 0.18)',
    },
    done: {
      border: '2px solid #EC4899',
      background: '#EC4899',
      boxShadow: '0 0 6px rgba(236, 72, 153, 0.22)',
    },
  };

  return (
    <div className={`group ${isDone ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2.5 px-3 py-3 bg-white/70 rounded-[14px] shadow-warm hover:shadow-warm-hover transition-all duration-200">
        {/* Status circle */}
        <button
          onClick={onCycleStatus}
          className="relative w-[0.9rem] h-[0.9rem] rounded-full shrink-0 transition-all duration-200 active:scale-90"
          style={statusStyles[task.status]}
          title={STATUS_CONFIG[task.status].label}
        >
          {task.status === 'in_progress' && (
            <svg className="absolute inset-0 m-auto w-[0.45rem] h-[0.45rem] text-violet-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 0 1 6 6h-6V6z" />
            </svg>
          )}
          {task.status === 'done' && (
            <svg className="absolute inset-0 m-auto w-[0.5rem] h-[0.5rem] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span
          className={`flex-1 text-sm truncate cursor-pointer ${isDone ? 'line-through text-violet-300' : 'text-violet-900'}`}
          onClick={onEdit}
        >
          {task.title}
        </span>

        {/* Sub-task count */}
        {children.length > 0 && (
          <span className="text-xs text-violet-400 font-medium tabular-nums shrink-0">
            {children.filter((c) => c.status === 'done').length}/{children.length}
          </span>
        )}

        {/* Date indicator */}
        {hasDate && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: task.dateType === 'range' ? '#7C3AED' : '#EC4899',
              boxShadow: `0 0 4px ${task.dateType === 'range' ? 'rgba(124, 58, 237, 0.3)' : 'rgba(236, 72, 153, 0.3)'}`,
            }}
            title={formatDateRange(task)}
          />
        )}

        {/* Edit — warm */}
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-full text-violet-300 hover:text-pink-600 hover:bg-pink-50/60"
        >
          <svg className="w-[0.9rem] h-[0.9rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Sub-tasks (compact) — warm */}
      {children.length > 0 && (
        <div className="mt-1.5 ml-4 space-y-1">
          {children.slice(0, 3).map((child) => (
            <div
              key={child.id}
              className={`flex items-center gap-2 px-2 py-1 ${child.status === 'done' ? 'opacity-40' : ''}`}
            >
              <div
                className="w-[0.55rem] h-[0.55rem] rounded-full shrink-0"
                style={{
                  border: child.status === 'todo'
                    ? '1.5px solid #C4B5FD'
                    : child.status === 'in_progress'
                    ? '1.5px solid #7C3AED'
                    : '1.5px solid #EC4899',
                  background: child.status === 'done' ? '#EC4899' : 'transparent',
                }}
              >
                {child.status === 'done' && (
                  <svg className="w-full h-full text-white p-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs truncate ${child.status === 'done' ? 'line-through text-violet-300' : 'text-violet-600'}`}>
                {child.title}
              </span>
            </div>
          ))}
          {children.length > 3 && (
            <div className="text-xs text-violet-300 px-2">+{children.length - 3} 更多</div>
          )}
        </div>
      )}
    </div>
  );
}
