import { useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Quadrant } from '../types';
import { getQuadrant, isRecurringTask, QUADRANT_CONFIG } from '../types';
import { todayStr, toDateStr, addDaysStr } from '../lib/date';
import Modal from './ui/Modal';

interface StatsPanelProps {
  onClose: () => void;
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

export default function StatsPanel({ onClose }: StatsPanelProps) {
  const tasks = useTaskStore((s) => s.tasks);

  const stats = useMemo(() => {
    const today = todayStr();

    // 统计口径说明：
    // 一次性任务看「完成时间」(finishedAt) 而不是计划日期 ——
    // 之前用 startDate 统计，导致今天随手做完的无日期任务完全不算数。
    const active = tasks.filter((t) => !t.isTrashed);
    const roots = active.filter((t) => !t.parentId);
    const standard = roots.filter((t) => !isRecurringTask(t));

    const doneToday = active.filter(
      (t) => t.finishedAt != null && toDateStr(new Date(t.finishedAt)) === today
    );

    // 今日待办：未完成，且没有日期或已经到期
    const pendingToday = standard.filter(
      (t) => t.status !== 'done' && (!t.startDate || t.startDate <= today)
    );

    const todayTotal = doneToday.length + pendingToday.length;
    const todayRate = todayTotal > 0 ? Math.round((doneToday.length / todayTotal) * 100) : 0;

    const doneAll = standard.filter((t) => t.status === 'done').length;
    const overallRate = standard.length > 0 ? Math.round((doneAll / standard.length) * 100) : 0;

    // 象限分布（只看一次性任务，周期任务不参与象限）
    const quad: Record<Quadrant, { total: number; done: number }> = {
      do: { total: 0, done: 0 },
      schedule: { total: 0, done: 0 },
      delegate: { total: 0, done: 0 },
      eliminate: { total: 0, done: 0 },
    };
    for (const t of standard) {
      const q = getQuadrant(t);
      quad[q].total++;
      if (t.status === 'done') quad[q].done++;
    }

    // 最近 7 天实际完成数
    const trend: { date: string; count: number; weekday: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const ds = addDaysStr(today, -i);
      const count = active.filter(
        (t) => t.finishedAt != null && toDateStr(new Date(t.finishedAt)) === ds
      ).length;
      trend.push({
        date: ds,
        count,
        weekday: WEEKDAY_SHORT[new Date(ds.replace(/-/g, '/')).getDay()],
      });
    }

    const weekTotal = trend.reduce((a, b) => a + b.count, 0);
    const best = trend.reduce((a, b) => (b.count > a.count ? b : a), trend[0]);
    const maxTrend = Math.max(...trend.map((d) => d.count), 1);

    return {
      todayRate,
      doneToday: doneToday.length,
      pendingToday: pendingToday.length,
      overallRate,
      doneAll,
      totalAll: standard.length,
      quad,
      trend,
      weekTotal,
      best,
      maxTrend,
    };
  }, [tasks]);

  const circleR = 32;
  const circleC = 2 * Math.PI * circleR;

  return (
    <Modal
      onClose={onClose}
      width="34rem"
      title="统计"
      subtitle="用完成时间说话，不看你计划了什么"
      icon={
        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
    >
      <div className="space-y-3.5">
        {/* 今日环形 + 概览 */}
        <div className="rounded-[18px] surface-card shadow-warm p-5 flex items-center gap-5">
          <div className="relative w-[5.6rem] h-[5.6rem] shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={circleR} fill="none" stroke="#F3E8FF" strokeWidth="7" />
              <circle
                cx="40" cy="40" r={circleR} fill="none"
                stroke="url(#todayGrad)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circleC}
                strokeDashoffset={circleC * (1 - stats.todayRate / 100)}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
              <defs>
                <linearGradient id="todayGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="fs-lg font-bold text-violet-800 tabular-nums leading-none">{stats.todayRate}%</span>
              <span className="fs-2xs text-violet-400 mt-0.5">今日</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <StatRow label="今天完成" value={stats.doneToday} accent="text-violet-700" />
            <StatRow label="今天还欠着" value={stats.pendingToday} accent="text-pink-500" />
            <StatRow label="累计完成" value={`${stats.doneAll} / ${stats.totalAll}`} accent="text-violet-600" />
            <div className="pt-1">
              <div className="h-1.5 rounded-full bg-violet-100/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${stats.overallRate}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #EC4899)',
                  }}
                />
              </div>
              <p className="fs-2xs text-violet-400 mt-1">整体完成率 {stats.overallRate}%</p>
            </div>
          </div>
        </div>

        {/* 7 日趋势 */}
        <div className="rounded-[18px] surface-card shadow-warm p-5">
          <div className="flex items-baseline justify-between mb-3.5">
            <h4 className="fs-sm font-bold text-violet-800">最近 7 天完成</h4>
            <span className="fs-2xs text-violet-400">
              共 {stats.weekTotal} 个
              {stats.weekTotal > 0 && stats.best.count > 0 && ` · 最猛是周${stats.best.weekday}`}
            </span>
          </div>
          <div className="flex items-stretch gap-1.5 h-[5.2rem]">
            {stats.trend.map((d, i) => {
              const isToday = i === stats.trend.length - 1;
              const pct = stats.maxTrend > 0 ? (d.count / stats.maxTrend) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="flex-1 h-full flex flex-col items-center gap-1.5 min-w-0"
                  title={`${d.date} · 完成 ${d.count} 个`}
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-[6px] transition-all duration-500"
                      style={{
                        height: d.count > 0 ? `${Math.max(pct, 10)}%` : '4px',
                        background: isToday
                          ? 'linear-gradient(180deg, #EC4899, #7C3AED)'
                          : d.count > 0
                          ? 'rgba(124, 58, 237, 0.38)'
                          : 'rgba(168, 164, 190, 0.18)',
                      }}
                    />
                  </div>
                  <span className={`fs-2xs leading-none ${isToday ? 'text-pink-500 font-bold' : 'text-violet-300'}`}>
                    {d.weekday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 象限分布 */}
        <div className="rounded-[18px] surface-card shadow-warm p-5">
          <h4 className="fs-sm font-bold text-violet-800 mb-3.5">象限分布</h4>
          <div className="space-y-3">
            {(['do', 'schedule', 'delegate', 'eliminate'] as const).map((q) => {
              const cfg = QUADRANT_CONFIG[q];
              const { total, done } = stats.quad[q];
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={q}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.accent }} />
                      <span className="fs-xs font-medium text-violet-600">{cfg.label}</span>
                      <span className="fs-2xs text-violet-300">{cfg.subtitle}</span>
                    </div>
                    <span className="fs-xs text-violet-400 tabular-nums">{done}/{total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-violet-100/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: cfg.accent,
                        opacity: total > 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {stats.totalAll === 0 && (
            <p className="fs-2xs text-violet-300 mt-3">还没有一次性任务，先建一个试试</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StatRow({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="fs-xs text-violet-400">{label}</span>
      <span className={`fs-md font-bold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}
