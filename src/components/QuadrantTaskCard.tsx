import type { Task } from '../types';
import { STATUS_CONFIG, formatDateRange } from '../types';

interface QuadrantTaskCardProps {
  task: Task;
  depth: number;
  allTasks: Task[];
  onEdit: () => void;
  onCycleStatus: () => void;
}

export default function QuadrantTaskCard({ task, depth, onEdit, onCycleStatus }: QuadrantTaskCardProps) {
  const isDone = task.status === 'done';
  const hasDate = task.dateType && task.dateType !== 'none' && task.startDate;
  const indentPx = depth * 16;

  const statusStyles: Record<Task['status'], React.CSSProperties> = {
    todo: { border: '2px solid #C4B5FD', background: 'transparent', boxShadow: 'none' },
    in_progress: { border: '2px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 6px rgba(124, 58, 237, 0.18)' },
    done: { border: '2px solid #EC4899', background: '#EC4899', boxShadow: '0 0 6px rgba(236, 72, 153, 0.22)' },
  };

  return (
    <div className={`group ${isDone ? 'opacity-40' : ''}`} style={{ marginLeft: indentPx }}>
      <div className={`flex items-center gap-2.5 px-3 py-3 bg-white/70 rounded-[14px] shadow-warm hover:shadow-warm-hover transition-all duration-200 ${depth > 0 ? 'mt-1.5' : ''}`}>
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

        <span className={`flex-1 text-xs truncate cursor-pointer ${isDone ? 'line-through text-violet-300' : 'text-violet-900'}`} onClick={onEdit}>
          {depth > 0 && <span className="text-violet-300 mr-1">↳</span>}
          {task.title}
        </span>

        {hasDate && (
          <span className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: task.dateType === 'range' ? '#7C3AED' : '#EC4899', boxShadow: `0 0 4px ${task.dateType === 'range' ? 'rgba(124, 58, 237, 0.3)' : 'rgba(236, 72, 153, 0.3)'}` }}
            title={formatDateRange(task)}
          />
        )}

        <button onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-full text-violet-300 hover:text-pink-600 hover:bg-pink-50/60">
          <svg className="w-[0.9rem] h-[0.9rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
