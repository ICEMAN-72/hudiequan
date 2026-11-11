import { useMemo, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToday } from '../hooks/useToday';
import { nextOccurrence, ageInDays, ageTone, formatAge } from '../lib/date';
import type { Task } from '../types';
import { formatDateDisplay } from '../types';
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

/** 方块太窄，"11月5日" 会占掉半行，压成 11/5 */
function shortDate(s?: string | null): string {
  if (!s) return '';
  const [, m, d] = s.split('-');
  if (!m || !d) return s;
  return `${Number(m)}/${Number(d)}`;
}

export default function RecurringTasksPanel({ onEdit, onCreateRecurring }: RecurringTasksPanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const cycleStatus = useTaskStore((s) => s.cycleStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const addSubTask = useTaskStore((s) => s.addSubTask);

  /** 当前展开的模板（点方块打开下方子任务区） */
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);

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

  const openGroup = groups.find((g) => g.templateId === openId) ?? null;
  const openTask = openGroup?.current ?? null;
  const children = openTask
    ? tasks.filter((c) => c.parentId === openTask.id && !c.isTrashed && c.status !== 'done')
    : [];

  // 本期躺了多久。方块里不放（会被读成「每周20天」，且违反「方块只负责认得出」），
  // 放在详情头部的元信息串里最自然。
  const showAge = useSettingsStore((s) => s.showAge);
  const today = useToday();
  const openDays = openTask ? ageInDays(openTask.createdAt, today) : 0;
  const openAge = ageTone(openDays);

  const closeDetail = () => {
    setOpenId(null);
    setAdding(false);
    setSubTitle('');
    setShowHistory(false);
  };

  const toggleOpen = (templateId: string) => {
    if (openId === templateId) {
      closeDetail();
      return;
    }
    setOpenId(templateId);
    setAdding(false);
    setSubTitle('');
    setShowHistory(false);
  };

  const commitSub = () => {
    if (!openTask || !subTitle.trim()) {
      setAdding(false);
      return;
    }
    addSubTask(openTask.id, subTitle.trim());
    setSubTitle('');
    // 连续录入：不关输入框，回车后继续等下一个
  };

  return (
    <div className="h-full flex flex-col p-3 anim-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg className="w-[1rem] h-[1rem] text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h3 className="fs-sm font-bold text-teal-700">周期任务</h3>
          <span className="fs-xs text-teal-300 tabular-nums">{groups.length}</span>
        </div>
      </div>

      {/* 方块网格 —— 一条横排卡片能放 1 项，做一个方块能放 1 项，
          但方块可以横竖同时铺开，同样的面积多出一倍以上。
          详情展开时整块让位（hidden）：面板只有 200 出头高，
          塞下 7.2rem 的方块就剩不下详情的地儿，硬挤的结果是方块被压成一条
          半截高的色带，比看不见更难看。想看别的就点 ✕ 收起再看。 */}
      <div className={`flex-1 min-h-0 overflow-y-auto scroll-thin ${openGroup ? 'hidden' : ''}`}>
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
          /* 固定 7.2rem 见方，不随面板宽度拉伸：
             方块一旦被拉成 180px，里面的两行标题就只剩一圈空。 */
          <div
            className="grid gap-2 pb-1 justify-start"
            style={{ gridTemplateColumns: 'repeat(auto-fill, 7.2rem)' }}
          >
            {groups.map((g) => {
              const t = g.current;
              const isActive = openId === g.templateId;
              const dateText = t?.startDate
                ? shortDate(t.startDate)
                : g.nextDate
                ? shortDate(g.nextDate)
                : '—';
              return (
                <div
                  key={g.templateId}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleOpen(g.templateId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleOpen(g.templateId);
                    }
                  }}
                  className={`rec-tile relative aspect-square min-h-0 overflow-hidden rounded-[12px] px-2 py-1.5 flex flex-col text-left cursor-pointer transition-all duration-200 ${
                    isActive ? 'rec-tile-active ring-2 ring-teal-300/60 shadow-warm-hover' : 'shadow-warm hover:shadow-warm-hover'
                  } ${!t ? 'opacity-60' : ''}`}
                  title={t ? `${g.title} · 点开看子任务` : `${g.title} · 本期已完成`}
                >
                  <div className="flex items-center justify-between gap-1 shrink-0">
                    <span className="fs-2xs font-semibold text-teal-500">{REC_LABELS[g.recurrence] ?? g.recurrence}</span>
                    {/* 状态圈：方块内唯一能直接完成任务的地方 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (t) cycleStatus(t.id);
                      }}
                      disabled={!t}
                      className="relative w-[1rem] h-[1rem] rounded-full shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-40"
                      style={
                        !t
                          ? { border: '2px dashed #A8A4BE', background: 'transparent' }
                          : t.status === 'in_progress'
                          ? { border: '2px solid #7C3AED', background: '#EDE9FE', boxShadow: '0 0 4px rgba(124,58,237,0.15)' }
                          : { border: '2px solid #5EEAD4', background: 'transparent' }
                      }
                      title={t ? '点一下完成本期，下一期会自动排出来' : '本期已完成'}
                    >
                      {t?.status === 'in_progress' && (
                        <svg className="absolute inset-0 m-auto w-[0.5rem] h-[0.5rem] text-violet-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a10 10 0 010 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 016 6h-6V6z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* 标题单独包一层：line-clamp 只在块级上下文里生效，
                      直接给 flex-1 的 <p> 用会退化成 overflow 硬裁，末尾留半个字。 */}
                  <div className="flex-1 min-h-0 overflow-hidden mt-1">
                    <p className="fs-xs font-semibold text-violet-800 leading-tight line-clamp-2 break-words">
                      {g.title}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-1 shrink-0">
                    <span className="fs-2xs text-violet-400 tabular-nums">{dateText}</span>
                    {g.history.length > 0 && (
                      <span className="fs-2xs text-teal-400 tabular-nums shrink-0">{g.history.length}期</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 新建：占一个同样大小的格子，比底部一条横线更像是这个网格的一部分 */}
            <button
              onClick={onCreateRecurring}
              className="aspect-square min-h-0 overflow-hidden rounded-[12px] border border-dashed border-teal-200/70 flex flex-col items-center justify-center gap-1 text-teal-400 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
            >
              <svg className="w-[1rem] h-[1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="fs-2xs">新建</span>
            </button>
          </div>
        )}
      </div>

      {/* 下方展开：子任务。方块只负责「认得出是哪一项」，
          具体内容和子任务一律在这里展开，避免方块内部塞进两三层信息。
          max-h-[70%] 换成 flex-1：方块网格让位之后，剩余空间全部给它，
          不用再猜百分比。 */}
      {openGroup && (
        <div className="flex-1 min-h-0 mt-2 flex flex-col rounded-[14px] surface-card border border-teal-100/60 anim-rise-in overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-1.5 shrink-0 border-b border-teal-100/50">
            {openTask ? (
              <button
                onClick={() => cycleStatus(openTask.id)}
                className="relative w-[1.05rem] h-[1.05rem] rounded-full shrink-0 transition-all duration-200 active:scale-90"
                style={
                  openTask.status === 'in_progress'
                    ? { border: '2px solid #7C3AED', background: '#EDE9FE' }
                    : { border: '2px solid #5EEAD4', background: 'transparent' }
                }
                title="完成本期"
              />
            ) : (
              <span className="w-[1.05rem] h-[1.05rem] rounded-full shrink-0" style={{ border: '2px dashed #A8A4BE' }} />
            )}

            <div className="flex-1 min-w-0">
              <p className="fs-xs font-bold text-violet-800 truncate">{openGroup.title}</p>
              <p className="fs-2xs text-violet-300 truncate">
                {REC_LABELS[openGroup.recurrence] ?? openGroup.recurrence}
                {openTask?.startDate
                  ? ` · ${formatDateDisplay(openTask.startDate)}`
                  : openGroup.nextDate
                  ? ` · 下期 ${formatDateDisplay(openGroup.nextDate)}`
                  : ' · 等待下期'}
                {showAge && openAge !== 'hidden' && (
                  <span className={`age-chip fs-2xs age-chip--${openAge}`}> · 已悬置 {formatAge(openDays)}</span>
                )}
                {openGroup.history.length > 0 && ` · 往期 ${openGroup.history.length}`}
              </p>
            </div>

            {openTask && (
              <>
                <button
                  onClick={() => { setAdding(true); setSubTitle(''); }}
                  className="icon-btn w-[1.05rem] h-[1.05rem] text-violet-300 hover:text-teal-600 hover:bg-teal-50/60"
                  title="添加子任务"
                >
                  <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(openTask.id)}
                  className="icon-btn w-[1.05rem] h-[1.05rem] text-violet-300 hover:text-pink-600 hover:bg-pink-50/60"
                  title="编辑"
                >
                  <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteTask(openTask.id)}
                  className="icon-btn w-[1.05rem] h-[1.05rem] text-violet-300 hover:text-red-400 hover:bg-red-50/60"
                  title="删除本期"
                >
                  <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={closeDetail}
              className="icon-btn w-[1.05rem] h-[1.05rem] text-violet-300 hover:text-violet-600 hover:bg-violet-50/60"
              title="收起"
            >
              <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* flex-1 min-h-0 而不是写死 max-h-[13rem]：
              写死的高度不知道面板还剩多少，撑过界就被外层的 overflow:hidden 切掉。
              交给 flex 分配，剩多少用多少，超出就在这里面滚。 */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-2.5 py-1.5 space-y-1.5">
            {adding && openTask && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] bg-white border border-teal-200/70">
                <div className="w-[0.85rem] h-[0.85rem] rounded-full border-2 border-teal-200 shrink-0" />
                <input
                  autoFocus
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitSub();
                    if (e.key === 'Escape') { setAdding(false); setSubTitle(''); }
                  }}
                  onBlur={() => { if (subTitle.trim()) commitSub(); else setAdding(false); }}
                  placeholder="子任务名称，回车继续加…"
                  className="flex-1 fs-xs text-violet-900 placeholder:text-violet-200 bg-transparent outline-none"
                />
              </div>
            )}

            {children.length === 0 && !adding ? (
              <p className="fs-2xs text-violet-300 px-1 py-2">
                {openTask ? '这一期还没有子任务' : '本期已完成，等下个周期'}
              </p>
            ) : (
              children
                .slice()
                .sort((a, b) => {
                  const o: Record<string, number> = { in_progress: 0, todo: 1, done: 2 };
                  return (o[a.status] || 1) - (o[b.status] || 1);
                })
                .map((child) => (
                  <TaskNode
                    key={child.id}
                    task={child}
                    depth={0}
                    allTasks={tasks.filter((x) => !x.isTrashed)}
                    onEdit={onEdit}
                  />
                ))
            )}

            {openGroup.history.length > 0 && (
              <div className="pt-1">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="fs-2xs text-teal-500 hover:text-teal-700 transition-colors"
                >
                  {showHistory ? '收起往期' : `查看往期 ${openGroup.history.length} 期`}
                </button>
                {showHistory && (
                  <div className="mt-1 pl-2.5 border-l-2 border-teal-100/60 space-y-0.5 anim-rise-in">
                    {openGroup.history.slice(0, 12).map((h) => (
                      <div key={h.id} className="flex items-center gap-2 py-0.5">
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
                    {openGroup.history.length > 12 && (
                      <p className="fs-2xs text-violet-300 pt-0.5">还有 {openGroup.history.length - 12} 期…</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
