import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task, Quadrant } from '../types';
import { getQuadrant, isRecurringTask, QUADRANT_CONFIG } from '../types';
import QuadrantTaskCard from './QuadrantTaskCard';

interface QuadrantViewProps {
  onEdit: (id: string) => void;
  /** 点象限表头直接在这一格里新建 —— 省掉「新建 → 再选一次象限」 */
  onCreate?: (q: Quadrant) => void;
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

export default function QuadrantView({ onEdit, onCreate }: QuadrantViewProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const updateTask = useTaskStore((s) => s.updateTask);
  /* 拖拽时的目标格。以前拖过去什么都没有，只有松手才知道落进哪一格 ——
     拖动全程是靠猜的。 */
  const [overQuadrant, setOverQuadrant] = useState<Quadrant | null>(null);

  const QUADRANT_VALUES: Record<Quadrant, { urgency: Task['urgency']; importance: Task['importance'] }> = {
    do: { urgency: 'high', importance: 'high' },
    schedule: { urgency: 'low', importance: 'high' },
    delegate: { urgency: 'high', importance: 'low' },
    eliminate: { urgency: 'low', importance: 'low' },
  };

  /* 四象限是「待办视图」：做完的事一律离场。
     以前这里跟着「显示已完成」开关走，开关一开，完成的任务就留在格子里，
     越做越满，真正还没做的反而被挤到看不见。
     离开这里不等于任务消失 —— 任务列表和存储柜照样能看到。 */
  const pendingTasks = tasks.filter((t) => !t.isTrashed && !isRecurringTask(t) && t.status !== 'done');
  const pendingIds = new Set(pendingTasks.map((t) => t.id));

  /* 父任务已完成、子任务还开着，这个状态是真实存在的 ——
     完成父任务不会级联子任务。这种子任务如果还按 parentId 归组，
     就会因为父级不在列表里而凭空消失，所以把它提升成根、单独成条。 */
  const isRootOf = (t: Task) => !t.parentId || !pendingIds.has(t.parentId);

  const grouped: Record<Quadrant, Task[]> = {
    do: [], schedule: [], delegate: [], eliminate: [],
  };
  const order: Record<Task['status'], number> = { in_progress: 0, todo: 1, done: 2 };

  for (const task of pendingTasks) {
    if (isRootOf(task)) grouped[getQuadrant(task)].push(task);
  }

  (Object.keys(grouped) as Quadrant[]).forEach((q) => {
    grouped[q].sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return b.createdAt - a.createdAt;
    });
  });

  const totalCount = pendingTasks.filter(isRootOf).length;

  /* 四格等分，不再按内容量伸缩。
     上一版用 sqrt 权重让格子随任务数长大，结果四格比例不匀，
     整块看着像拼贴而不是一张网。这一版要的就是规整：
     右列贯通两行之后每个格子是 460×476，接近正方形，
     四个格子尺寸一致，视觉上才立得住。 */
  return (
    <div className="h-full flex flex-col p-3 anim-slide-up">
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        <svg className="w-[0.95rem] h-[0.95rem] text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4z M4 12h16 M12 4v16" />
        </svg>
        <h3 className="text-sm font-bold text-violet-800">四象限</h3>
        <span className="fs-2xs text-violet-300 tabular-nums">{totalCount} 项待办</span>
      </div>

      {/* 窄屏单列四行：375px 宽下就算保持 2×2，每格也只有 170px，
          标题刚写完就到边了。宽屏仍是 2×2 的正方格。 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-4 md:grid-cols-2 md:grid-rows-2 gap-2">
        {LAYOUT.flat().map((q) => {
          const config = QUADRANT_CONFIG[q];
          const items = grouped[q];

          return (
            <div key={q}
              className={`quad-tile quad-tile--${q} flex flex-col overflow-hidden min-h-0 dew-highlight shadow-warm`}
              /* 拖到哪一格，哪一格就用它自己的色描边 —— 松手前就知道会落在哪。
                 outline 不用 box-shadow：shadow-warm 在外层，两者互不覆盖。 */
              style={overQuadrant === q ? { outline: `2px solid ${config.accent}`, outlineOffset: '-2px' } : undefined}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (overQuadrant !== q) setOverQuadrant(q); }}
              /* relatedTarget 还在格子里就不清 —— 不然经过子元素时会疯狂闪烁 */
              onDragLeave={(e) => {
                e.stopPropagation();
                const to = e.relatedTarget as Node | null;
                if (!to || !e.currentTarget.contains(to)) setOverQuadrant(null);
              }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                setOverQuadrant(null);
                const taskId = e.dataTransfer.getData('task/id');
                if (taskId) { const vals = QUADRANT_VALUES[q]; updateTask(taskId, vals); }
              }}>
              {/* 象限头部压成单行：标题 + 说明 + 数量。
                  原来是「标题行 + 说明行」，两行吃掉 63px，而每个格子总共才 200 出头 —— 光标题就占掉三成。
                  整条现在是个按钮：点一下就在这一格里新建，不用「新建 → 再选一次象限」。 */}
              <button type="button"
                onClick={() => onCreate?.(q)}
                title={`在「${config.label}」里新建任务`}
                className={`quad-head quad-head--${q} group/head w-full px-2 py-1 shrink-0 flex items-baseline gap-1.5 text-left cursor-pointer`}>
                <span className={`fs-xs font-bold shrink-0 ${config.headerText}`}>{config.label}</span>
                <span className={`fs-2xs flex-1 truncate text-left ${config.headerText} opacity-40`} title={config.subtitle}>{config.subtitle}</span>
                {items.length > 0 && (
                  <span className={`fs-2xs font-bold shrink-0 ${config.headerText} opacity-50 tabular-nums`}>{items.length}</span>
                )}
                {/* 常驻但很淡，hover 变实：手机上没 hover，不能只在 hover 才给提示 */}
                <svg className="w-[0.62rem] h-[0.62rem] shrink-0 opacity-35 group-hover/head:opacity-90 transition-opacity"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>

              {/* 永远单列。
                  之前超过 14 条会切成两列，本意是多塞几条，实际效果是同一格里
                  并排两摞卡片 —— 象限本身是「一眼扫过去」的东西，两列会让它
                  变成需要逐列读的表，比看不见更糟。宁可滚动。 */}
              <div className="p-1 flex-1 overflow-y-auto scroll-thin min-h-0">
                {items.length === 0 ? (
                  /* 空态原来用 text-violet-200，铺在四张彩纸上基本看不见。
                     改成中性半透明，哪种纸底上都读得出来。 */
                  <div className="flex items-center justify-center h-full py-4">
                    <span className="fs-2xs quad-empty" title="把任务拖到这一格">—</span>
                  </div>
                ) : (
                  items.map((task) => renderTree(task, 0, pendingTasks, onEdit, cycleStatus))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
