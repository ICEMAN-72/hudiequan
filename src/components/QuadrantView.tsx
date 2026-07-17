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

export default function QuadrantView({ onEdit }: QuadrantViewProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const showCompleted = useSettingsStore((s) => s.showCompleted);

  const filteredTasks = tasks.filter((t) => !t.parentId && (showCompleted || t.status !== 'done'));

  const grouped: Record<Quadrant, Task[]> = {
    do: [], schedule: [], delegate: [], eliminate: [],
  };
  filteredTasks.forEach((task) => grouped[getQuadrant(task)].push(task));

  Object.keys(grouped).forEach((key) => {
    grouped[key as Quadrant].sort((a, b) => {
      const order = { in_progress: 0, todo: 1, done: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.createdAt - a.createdAt;
    });
  });

  const totalCount = filteredTasks.length;

  return (
    <div className="h-full flex flex-col anim-slide-up">
      {/* Section header — warm */}
      <div className="flex items-center gap-2.5 mb-3 shrink-0">
        <svg className="w-[1.2rem] h-[1.2rem] text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z M4 12h16 M12 4v16" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">四象限</h3>
        <span className="text-xs text-violet-300">{totalCount} 项</span>
      </div>

      {/* 2x2 grid — warm rounded cells */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
        {LAYOUT.flat().map((q) => {
          const config = QUADRANT_CONFIG[q];
          const items = grouped[q];

          return (
            <div
              key={q}
              className={`${config.bg} ${config.border} border rounded-[16px] flex flex-col overflow-hidden min-h-0 dew-highlight shadow-warm`}
            >
              {/* Header — warm rounded */}
              <div className={`${config.headerBg} px-4 py-3 border-b ${config.border} shrink-0`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-bold ${config.headerText}`}>
                    {config.label}
                  </h4>
                  {items.length > 0 && (
                    <span className={`text-xs font-bold ${config.headerText} opacity-50 tabular-nums`}>
                      {items.length}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1.5 ${config.headerText} opacity-45`}>
                  {config.subtitle}
                </p>
              </div>

              {/* Tasks — scrollable, warm spacing */}
              <div className="p-2.5 space-y-2 flex-1 overflow-y-auto min-h-0">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-8">
                    <span className="text-xs text-violet-200">—</span>
                  </div>
                ) : (
                  items.map((task) => (
                    <QuadrantTaskCard
                      key={task.id}
                      task={task}
                      allTasks={tasks}
                      onEdit={() => onEdit(task.id)}
                      onCycleStatus={() => cycleStatus(task.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
