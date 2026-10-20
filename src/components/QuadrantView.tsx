import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task, Quadrant } from '../types';
import { getQuadrant, isRecurringTask, QUADRANT_CONFIG } from '../types';
import QuadrantTaskCard from './QuadrantTaskCard';

interface QuadrantViewProps {
  onEdit: (id: string) => void;
}

const LAYOUT: Quadrant[][] = [
  ['schedule', 'do'],
  ['eliminate', 'delegate'],
];

/** Render a task and all its descendants recursively with depth indentation */
function renderTree(task: Task, depth: number, allTasks: Task[], onEdit: (id: string) => void, cycleStatus: (id: string) => void): React.ReactNode[] {
  const children = allTasks.filter((t) => t.parentId === task.id && !t.isTrashed);
  const nodes: React.ReactNode[] = [
    <QuadrantTaskCard key={task.id} task={task} depth={depth} allTasks={allTasks} onEdit={() => onEdit(task.id)} onCycleStatus={() => cycleStatus(task.id)} />,
  ];
  const sorted = [...children].sort((a, b) => {
    const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.createdAt - a.createdAt;
  });
  for (const child of sorted) {
    nodes.push(...renderTree(child, depth + 1, allTasks, onEdit, cycleStatus));
  }
  return nodes;
}

export default function QuadrantView({ onEdit }: QuadrantViewProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const updateTask = useTaskStore((s) => s.updateTask);
  const showCompleted = useSettingsStore((s) => s.showCompleted);

  const QUADRANT_VALUES: Record<Quadrant, { urgency: Task['urgency']; importance: Task['importance'] }> = {
    do: { urgency: 'high', importance: 'high' },
    schedule: { urgency: 'low', importance: 'high' },
    delegate: { urgency: 'high', importance: 'low' },
    eliminate: { urgency: 'low', importance: 'low' },
  };

  // Filter: non-trashed, optionally hide done
  const visibleTasks = tasks.filter((t) => !t.isTrashed && !isRecurringTask(t) && (showCompleted || t.status !== 'done'));

  const grouped: Record<Quadrant, Task[]> = {
    do: [], schedule: [], delegate: [], eliminate: [],
  };
  visibleTasks.forEach((task) => grouped[getQuadrant(task)].push(task));

  // Sort each group: roots first, then by status
  Object.keys(grouped).forEach((key) => {
    const q = key as Quadrant;
    const roots = grouped[q].filter((t) => !t.parentId);
    const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };
    roots.sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.createdAt - a.createdAt;
    });
    grouped[q] = roots;
  });

  const totalCount = visibleTasks.filter((t) => !t.parentId).length;

  return (
    <div className="h-full flex flex-col p-3 anim-slide-up">
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        <svg className="w-[0.95rem] h-[0.95rem] text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z M4 12h16 M12 4v16" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">四象限</h3>
        <span className="fs-2xs text-violet-300 tabular-nums">{totalCount} 项</span>
      </div>

      {/* gap 12→8：四个格子各自的高度就多出 8px，全都还给任务条 */}
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2">
        {LAYOUT.flat().map((q) => {
          const config = QUADRANT_CONFIG[q];
          const items = grouped[q];

          return (
            <div key={q}
              className={`${config.bg} ${config.border} border rounded-[12px] flex flex-col overflow-hidden min-h-0 dew-highlight shadow-warm`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                const taskId = e.dataTransfer.getData('task/id');
                if (taskId) { const vals = QUADRANT_VALUES[q]; updateTask(taskId, vals); }
              }}>
              {/* 象限头部压成单行：标题 + 说明 + 数量。
                  原来是「标题行 + 说明行」，两行吃掉 63px，而每个格子总共才 200 出头 —— 光标题就占掉三成。 */}
              <div className={`${config.headerBg} px-2 py-1 border-b ${config.border} shrink-0 flex items-baseline gap-1.5`}>
                <h4 className={`fs-xs font-bold shrink-0 ${config.headerText}`}>{config.label}</h4>
                <p className={`fs-2xs flex-1 truncate ${config.headerText} opacity-40`} title={config.subtitle}>{config.subtitle}</p>
                {items.length > 0 && (
                  <span className={`fs-2xs font-bold shrink-0 ${config.headerText} opacity-50 tabular-nums`}>{items.length}</span>
                )}
              </div>

              <div className="p-1 space-y-1.5 flex-1 overflow-y-auto scroll-thin min-h-0">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-4"><span className="fs-2xs text-violet-200">—</span></div>
                ) : (
                  items.map((task) => renderTree(task, 0, visibleTasks, onEdit, cycleStatus))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
