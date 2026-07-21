import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { getQuadrant, getEffectiveQuadrant, QUADRANT_CONFIG, formatDateRange } from '../types';
import type { Task } from '../types';

/** Format timestamp → time string (precision to hour) */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  return `${m}/${day} ${h}:00`;
}

interface TaskNodeProps {
  task: Task;
  depth: number;
  allTasks: Task[];
  onEdit: (id: string) => void;
}

/** Status circle — click to cycle: todo → in_progress → done */
function StatusButton({ status, onClick }: { status: Task['status']; onClick: () => void }) {
  const styles: Record<Task['status'], React.CSSProperties> = {
    todo: { border: '2.5px solid #C4B5FD', background: 'transparent', boxShadow: 'none' },
    in_progress: { border: '2.5px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 8px rgba(124, 58, 237, 0.2)' },
    done: { border: '2.5px solid #EC4899', background: '#EC4899', boxShadow: '0 0 8px rgba(236, 72, 153, 0.25)' },
  };

  return (
    <button
      onClick={onClick}
      className="relative w-[1.35rem] h-[1.35rem] rounded-full shrink-0 transition-all duration-200 active:scale-90"
      style={styles[status]}
      title="点击切换状态"
    >
      {status === 'in_progress' && (
        <svg className="absolute inset-0 m-auto w-[0.6rem] h-[0.6rem] text-violet-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2a6 6 0 0 1 6 6h-6V6z" />
        </svg>
      )}
      {status === 'done' && (
        <svg className="absolute inset-0 m-auto w-[0.7rem] h-[0.7rem] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function DateBadge({ task }: { task: Task }) {
  if (!task.dateType || task.dateType === 'none' || !task.startDate) return null;
  const text = formatDateRange(task);
  const isRange = task.dateType === 'range';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
      style={{ background: isRange ? 'rgba(124, 58, 237, 0.1)' : 'rgba(236, 72, 153, 0.1)', color: isRange ? '#7C3AED' : '#EC4899' }}>
      <svg className="w-[0.7rem] h-[0.7rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
      {text}
    </span>
  );
}

/** Sort function used in child rendering */
function sortChildren(children: Task[]): Task[] {
  const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
  return [...children].sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.createdAt - a.createdAt;
  });
}

export default function TaskNode({ task, depth, allTasks, onEdit }: TaskNodeProps) {
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const permanentlyDelete = useTaskStore((s) => s.permanentlyDelete);
  const addSubTask = useTaskStore((s) => s.addSubTask);
  const moveTask = useTaskStore((s) => s.moveTask);

  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');

  const children = allTasks.filter((t) => t.parentId === task.id && !t.isTrashed);
  const quadrant = task.parentId ? getEffectiveQuadrant(task, allTasks) : getQuadrant(task);
  const qConfig = QUADRANT_CONFIG[quadrant];
  const isDone = task.status === 'done';
  const isTrash = task.isTrashed === true;
  const indentPx = depth * 28; // 1.75rem per level — much more visible

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('task/id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('task/id')) setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.stopPropagation(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const draggedId = e.dataTransfer.getData('task/id');
    if (draggedId && draggedId !== task.id) { moveTask(draggedId, task.id); setExpanded(true); }
  };
  const handleSubTaskSave = () => {
    if (!subTitle.trim()) return;
    addSubTask(task.id, subTitle.trim());
    setSubTitle(''); setShowSubInput(false); setExpanded(true);
  };

  return (
    <div>
      <div
        draggable={!isTrash}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex items-center gap-3 px-5 py-4 bg-white/80 rounded-[16px] transition-all duration-200 cursor-grab active:cursor-grabbing dew-highlight ${
          dragOver ? 'ring-2 ring-violet-300 ring-offset-2 shadow-warm-hover' : 'shadow-warm hover:shadow-warm-hover'
        } ${isDone || isTrash ? 'opacity-45' : ''}`}
        style={{ marginLeft: indentPx }}
      >
        {/* Drag handle */}
        {!isTrash && (
          <svg className="w-[1rem] h-[1rem] text-violet-200 group-hover:text-violet-400 shrink-0 transition-colors" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
          </svg>
        )}

        {/* Status or trash icon */}
        {isTrash ? (
          <span className="shrink-0 text-sm opacity-60" title="已删除">🗑️</span>
        ) : (
          <StatusButton status={task.status} onClick={() => cycleStatus(task.id)} />
        )}

        {/* Expand toggle */}
        {children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <svg className="w-[1rem] h-[1rem] text-violet-400 hover:text-violet-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4l6 6-6 6V4z" />
            </svg>
          </button>
        )}

        {/* Title + create time */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-sm truncate ${isDone || isTrash ? 'line-through text-violet-300' : 'text-violet-900'}`}>
            {task.title}
          </span>
          <span className="text-[11px] text-violet-300 font-medium tabular-nums shrink-0 ml-auto mr-2">
            {formatTime(task.createdAt)}
          </span>
        </div>

        <DateBadge task={task} />

        {children.length > 0 && (
          <span className="text-xs text-violet-400 font-medium tabular-nums shrink-0">
            {children.filter((c) => c.status === 'done').length}/{children.length}
          </span>
        )}

        {!task.parentId && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${qConfig.badge}`}>{qConfig.label}</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {isTrash ? (
            <>
              <button onClick={() => restoreTask(task.id)} className="p-2 rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/60 transition-colors" title="恢复">
                <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={() => permanentlyDelete(task.id)} className="p-2 rounded-full text-violet-300 hover:text-red-400 hover:bg-red-50/60 transition-colors" title="永久删除">
                <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowSubInput(true)} className="p-2 rounded-full text-violet-300 hover:text-violet-600 hover:bg-violet-50/60 transition-colors" title="添加子任务">
                <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button onClick={() => onEdit(task.id)} className="p-2 rounded-full text-violet-300 hover:text-pink-600 hover:bg-pink-50/60 transition-colors" title="编辑">
                <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => deleteTask(task.id)} className="p-2 rounded-full text-violet-300 hover:text-red-400 hover:bg-red-50/60 transition-colors" title="删除">
                <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {dragOver && <div className="text-xs text-violet-500 font-medium py-2 anim-fade-in" style={{ marginLeft: indentPx + 32 }}>↳ 拖入此处作为子任务</div>}

      {showSubInput && (
        <div className="py-2 anim-slide-up" style={{ marginLeft: (depth + 1) * 28 }}>
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white/80 rounded-[16px] shadow-warm border-2 border-violet-200/40">
            <div className="w-[1.35rem] h-[1.35rem] rounded-full border-2.5 border-violet-200 shrink-0" />
            <input autoFocus value={subTitle} onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubTaskSave(); if (e.key === 'Escape') { setShowSubInput(false); setSubTitle(''); } }}
              onBlur={() => { if (subTitle.trim()) handleSubTaskSave(); else { setShowSubInput(false); setSubTitle(''); } }}
              placeholder="子任务名称…" className="flex-1 text-sm text-violet-900 placeholder:text-violet-200 bg-transparent outline-none" />
          </div>
        </div>
      )}

      {expanded && children.length > 0 && (
        <div className="mt-3 space-y-3">
          {sortChildren(children).map((child) => (
            <TaskNode key={child.id} task={child} depth={depth + 1} allTasks={allTasks} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
