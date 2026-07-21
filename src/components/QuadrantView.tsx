import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task, Quadrant } from '../types';
import { getQuadrant, QUADRANT_CONFIG } from '../types';
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
  const showCompleted = useSettingsStore((s) => s.showCompleted);

  // Filter: non-trashed, optionally hide done
  const visibleTasks = tasks.filter((t) => !t.isTrashed && (showCompleted || t.status !== 'done'));

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
    <div className="h-full flex flex-col anim-slide-up">
      <div className="flex items-center gap-2.5 mb-3 shrink-0">
        <svg className="w-[1.2rem] h-[1.2rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z M4 12h16 M12 4v16" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">四象限</h3>
        <span className="text-xs text-violet-300">{totalCount} 项</span>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3">
        {LAYOUT.flat().map((q) => {
          const config = QUADRANT_CONFIG[q];
          const items = grouped[q];

          return (
            <div key={q} className={`${config.bg} ${config.border} border rounded-[16px] flex flex-col overflow-hidden min-h-0 dew-highlight shadow-warm`}>
              <div className={`${config.headerBg} px-4 py-3 border-b ${config.border} shrink-0`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-bold ${config.headerText}`}>{config.label}</h4>
                  {items.length > 0 && (
                    <span className={`text-xs font-bold ${config.headerText} opacity-50 tabular-nums`}>{items.length}</span>
                  )}
                </div>
                <p className={`text-xs mt-1.5 ${config.headerText} opacity-45`}>{config.subtitle}</p>
              </div>

              <div className="p-2.5 flex-1 overflow-y-auto min-h-0">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-8"><span className="text-xs text-violet-200">—</span></div>
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
