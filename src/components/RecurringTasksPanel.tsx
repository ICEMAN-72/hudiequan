import { useMemo, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types';
import { formatDateDisplay } from '../types';
import { nextOccurrence } from '../lib/date';
import TaskNode from './TaskNode';

interface RecurringTasksPanelProps {
  onEdit: (id: string) => void;
  onCreateRecurring: () => void;
}

interface TemplateGroup {
  templateId: string;
  title: string;
  recurrence: string;
  /** 当前这一期（未完成） */
  current: Task | null;
  /** 往期已完成的，按日期倒序 */
  history: Task[];
  /** 当前期之后的下一次日期 */
  nextDate: string | null;
}

const REC_LABELS: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' };

export default function RecurringTasksPanel({ onEdit, onCreateRecurring }: RecurringTasksPanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const addSubTask = useTaskStore((s) => s.addSubTask);

  const [addSubId, setAddSubId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  /**
   * 按 templateId 归组。
   * 之前是「一条任务一行」，完成即生成下期、本期标 done 被过滤掉，
   * 结果历史彻底看不见 —— 用户的原意是「完成后下个周期才重新出现」，
   * 而不是「这一期从世界上消失」。现在每期都留在组里，可以翻。
   */
  const groups = useMemo<TemplateGroup[]>(() => {
    const recurring = tasks.filter(
      (t) => !t.isTrashed && !t.parentId && t.recurrence && t.recurrence !== 'none'
    );

    const map = new Map<string, Task[]>();
    for (const t of recurring) {
      const key = t.templateId ?? t.id;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }

    const result: TemplateGroup[] = [];
    for (const [templateId, list] of map) {
      const open = list.filter((t) => t.status !== 'done');
      // 当前期：优先取最接近今天的未完成实例
      const current = open.length > 0
        ? open.reduce((a, b) => ((a.startDate ?? '') <= (b.startDate ?? '') ? b : a))
        : null;

      const history = list
        .filter((t) => t.status === 'done')
        .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

      const anchor = current ?? history[0];
      const recurrence = (anchor?.recurrence ?? 'daily') as 'daily' | 'weekly' | 'monthly';

      result.push({
        templateId,
        title: anchor?.title ?? '未命名',
        recurrence,
        current,
        history,
        nextDate: current ? null : nextOccurrence(recurrence, history[0]?.startDate),
      });
    }

    // 有当前期的排前面，再按标题
    return result.sort((a, b) => {
      if (!!a.current !== !!b.current) return a.current ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col p-4 anim-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg className="w-[1rem] h-[1rem] text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="fs-sm font-bold text-teal-700">周期任务</h3>
          <span className="fs-xs text-teal-300 tabular-nums">{groups.length}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin space-y-2.5 pr-1">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <svg className="w-8 h-8 text-teal-200 mb-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="fs-xs text-teal-300">还没有周期任务</p>
            <button onClick={onCreateRecurring} className="fs-xs text-teal-500 hover:text-teal-700 transition-colors">
              + 新建周期任务
            </button>
          </div>
        ) : (
          groups.map((g) => {
            const t = g.current;
            const isOpen = expandedHistory.has(g.templateId);
            return (
              <div key={g.templateId} className="space-y-2">
                <div className="group flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] surface-card shadow-warm hover:shadow-warm-hover transition-all duration-200">
                  {/* 状态圈 —— 只在有当前期时可点 */}
                  <button
                    onClick={() => t && cycleStatus(t.id)}
                    disabled={!t}
                    className="relative w-[1.05rem] h-[1.05rem] rounded-full shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-40"
                    style={
                      !t
                        ? { border: '2px dashed #A8A4BE', background: 'transparent' }
                        : t.status === 'in_progress'
                        ? { border: '2px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 4px rgba(124,58,237,0.15)' }
                        : { border: '2px solid #5EEAD4', background: 'transparent' }
                    }
                    title={t ? '点一下完成任务，下一期会自动排出来' : '这一期已完成，等下个周期'}
                  >
                    {t?.status === 'in_progress' && (
                      <svg className="absolute inset-0 m-auto w-[0.5rem] h-[0.5rem] text-violet-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a10 10 0 010 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 016 6h-6V6z" />
                      </svg>
                    )}
                  </button>

                  {/* 标题 + 日期 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`fs-xs text-violet-800 truncate ${t ? 'cursor-pointer' : 'text-violet-400'}`}
                      onClick={() => (t ? onEdit(t.id) : undefined)}
                    >
                      {g.title}
                    </p>
                    <p className="fs-2xs text-violet-300 mt-0.5">
                      {t?.startDate
                        ? formatDateDisplay(t.startDate)
                        : g.nextDate
                        ? `下期 ${formatDateDisplay(g.nextDate)}`
                        : '等待下期'}
                    </p>
                  </div>

                  {/* 频率 */}
                  <span className="fs-2xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium shrink-0">
                    {REC_LABELS[g.recurrence] ?? g.recurrence}
                  </span>

                  {/* 历史 */}
                  {g.history.length > 0 && (
                    <button
                      onClick={() => toggleHistory(g.templateId)}
                      className={`fs-2xs px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                        isOpen ? 'bg-teal-50 text-teal-600' : 'text-teal-400 hover:bg-teal-50/60'
                      }`}
                      title="查看往期"
                    >
                      往期 {g.history.length}
                    </button>
                  )}

                  {/* 操作 */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {t && (
                      <button
                        onClick={() => { setAddSubId(t.id); setSubTitle(''); }}
                        className="p-1.5 rounded-full text-violet-300 hover:text-teal-600 hover:bg-teal-50/60 transition-colors"
                        title="添加子任务"
                      >
                        <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    {t && (
                      <button onClick={() => onEdit(t.id)}
                        className="p-1.5 rounded-full text-violet-300 hover:text-pink-600 hover:bg-pink-50/60 transition-colors" title="编辑">
                        <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => t && deleteTask(t.id)}
                      disabled={!t}
                      className="p-1.5 rounded-full text-violet-300 hover:text-red-400 hover:bg-red-50/60 transition-colors disabled:opacity-30"
                      title="删除本期"
                    >
                      <svg className="w-[0.85rem] h-[0.85rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 内联新增子任务 */}
                {t && addSubId === t.id && (
                  <div className="ml-5 py-1 anim-rise-in">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[12px] surface-card border border-teal-100/50">
                      <div className="w-[0.85rem] h-[0.85rem] rounded-full border-2 border-teal-200 shrink-0" />
                      <input
                        autoFocus
                        value={subTitle}
                        onChange={(e) => setSubTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && subTitle.trim()) { addSubTask(t.id, subTitle.trim()); setAddSubId(null); setSubTitle(''); }
                          if (e.key === 'Escape') { setAddSubId(null); setSubTitle(''); }
                        }}
                        onBlur={() => { if (subTitle.trim()) addSubTask(t.id, subTitle.trim()); setAddSubId(null); setSubTitle(''); }}
                        placeholder="子任务名称…"
                        className="flex-1 fs-xs text-violet-900 placeholder:text-violet-200 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 当前期的子任务 */}
                {t && tasks.filter((c) => c.parentId === t.id && !c.isTrashed && c.status !== 'done').length > 0 && (
                  <div className="ml-5 space-y-1.5">
                    {tasks
                      .filter((c) => c.parentId === t.id && !c.isTrashed && c.status !== 'done')
                      .sort((a, b) => {
                        const o: Record<string, number> = { in_progress: 0, todo: 1, done: 2 };
                        return (o[a.status] || 1) - (o[b.status] || 1);
                      })
                      .map((child) => (
                        <TaskNode key={child.id} task={child} depth={0} allTasks={tasks.filter((x) => !x.isTrashed)} onEdit={onEdit} />
                      ))}
                  </div>
                )}

                {/* 往期 */}
                {isOpen && g.history.length > 0 && (
                  <div className="ml-5 pl-3 border-l-2 border-teal-100/60 space-y-1 py-0.5 anim-rise-in">
                    {g.history.slice(0, 12).map((h) => (
                      <div key={h.id} className="flex items-center gap-2 py-1">
                        <svg className="w-3 h-3 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="fs-2xs text-violet-400 truncate flex-1">
                          {h.startDate ? formatDateDisplay(h.startDate) : '未设日期'}
                        </span>
                        {h.finishedAt && (
                          <span className="fs-2xs text-violet-300 shrink-0 tabular-nums">
                            {new Date(h.finishedAt).getMonth() + 1}/{new Date(h.finishedAt).getDate()} 完成
                          </span>
                        )}
                      </div>
                    ))}
                    {g.history.length > 12 && (
                      <p className="fs-2xs text-violet-300 pt-0.5">还有 {g.history.length - 12} 期…</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
