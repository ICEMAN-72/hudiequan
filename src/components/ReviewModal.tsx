import { useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import { getQuadrant, isRecurringTask, QUADRANT_CONFIG } from '../types';
import { todayStr, toDateStr, addDaysStr } from '../lib/date';
import Modal from './ui/Modal';

interface ReviewModalProps {
  onClose: () => void;
}

/**
 * 每日复盘。
 * 只回答一个问题：今天干成了什么，还剩什么。
 */
export default function ReviewModal({ onClose }: ReviewModalProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);

  const data = useMemo(() => {
    const today = todayStr();
    const active = tasks.filter((t) => !t.isTrashed && !t.parentId);

    const finished = active.filter(
      (t) => t.finishedAt != null && toDateStr(new Date(t.finishedAt)) === today
    );

    // 今天该做但没做的：无日期 或 已到期 或 今天开始
    const pending = active.filter(
      (t) =>
        t.status !== 'done' &&
        (!t.startDate || t.startDate <= today) &&
        !isRecurringTask(t)
    );

    return { today, finished, pending };
  }, [tasks]);

  const moveAllToTomorrow = () => {
    const tomorrow = addDaysStr(data.today, 1);
    for (const t of data.pending) {
      updateTask(t.id, { dateType: 'point', startDate: tomorrow, endDate: undefined });
    }
    onClose();
  };

  const finishedCount = data.finished.length;
  const pendingCount = data.pending.length;
  const verdict =
    finishedCount === 0 && pendingCount === 0
      ? '今天什么都没安排，挺好'
      : pendingCount === 0
      ? '今天清空了，收工'
      : finishedCount > pendingCount
      ? '今天推进得不错'
      : '还剩一些，明天接着来';

  return (
    <Modal
      onClose={onClose}
      width="30rem"
      title="今天收个尾"
      subtitle={data.today}
      iconBg="linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)"
      icon={
        <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      }
      footer={
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full fs-xs font-semibold text-violet-500 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            知道了
          </button>
          {pendingCount > 0 && (
            <button
              onClick={moveAllToTomorrow}
              className="flex-1 py-2.5 rounded-full fs-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
            >
              剩的挪到明天
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {/* 数字 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] px-4 py-3.5" style={{ background: 'linear-gradient(135deg, rgba(243,232,255,0.7) 0%, rgba(252,231,243,0.5) 100%)' }}>
            <div className="fs-xl font-bold text-violet-700 tabular-nums leading-none">{finishedCount}</div>
            <div className="fs-2xs text-violet-400 mt-1.5">今天完成</div>
          </div>
          <div className="rounded-[16px] px-4 py-3.5" style={{ background: 'linear-gradient(135deg, rgba(255,241,242,0.7) 0%, rgba(253,242,248,0.5) 100%)' }}>
            <div className="fs-xl font-bold text-pink-500 tabular-nums leading-none">{pendingCount}</div>
            <div className="fs-2xs text-pink-400 mt-1.5">还欠着</div>
          </div>
        </div>

        <p className="fs-xs text-violet-500 px-1">{verdict}</p>

        {/* 已完成 */}
        {finishedCount > 0 && (
          <div>
            <h4 className="fs-2xs font-bold text-violet-400 mb-2 px-1">今天干完的</h4>
            <div className="space-y-1.5">
              {data.finished.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-[10px] surface-card">
                  <svg className="w-3.5 h-3.5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="fs-xs text-violet-400 line-through truncate">{t.title}</span>
                </div>
              ))}
              {finishedCount > 6 && <p className="fs-2xs text-violet-300 px-1">还有 {finishedCount - 6} 个…</p>}
            </div>
          </div>
        )}

        {/* 未完成 */}
        {pendingCount > 0 && (
          <div>
            <h4 className="fs-2xs font-bold text-violet-400 mb-2 px-1">还没动的</h4>
            <div className="space-y-1.5">
              {data.pending.slice(0, 6).map((t) => {
                const q = QUADRANT_CONFIG[getQuadrant(t)];
                return (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-[10px] surface-card">
                    <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: q.accent }} />
                    <span className="fs-xs text-violet-700 truncate flex-1">{t.title}</span>
                    <span className="fs-2xs shrink-0" style={{ color: q.accent }}>{q.label}</span>
                  </div>
                );
              })}
              {pendingCount > 6 && <p className="fs-2xs text-violet-300 px-1">还有 {pendingCount - 6} 个…</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
