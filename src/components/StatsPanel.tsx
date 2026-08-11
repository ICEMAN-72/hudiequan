import { useTaskStore } from '../store/taskStore';

interface StatsPanelProps {
  onClose: () => void;
}

export default function StatsPanel({ onClose }: StatsPanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTasks = tasks.filter((t) => !t.isTrashed);
  const rootTasks = activeTasks.filter((t) => !t.parentId);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = activeTasks.filter((t) => !t.parentId && t.dateType === 'point' && t.startDate === today);
  const todayDone = todayTasks.filter((t) => t.status === 'done').length;
  const todayRate = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

  const doneAll = rootTasks.filter((t) => t.status === 'done').length;
  const totalAll = rootTasks.length;
  const overallRate = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

  // Quadrant distribution
  const quadCounts: Record<string, number> = { do: 0, schedule: 0, delegate: 0, eliminate: 0 };
  const quadDone: Record<string, number> = { do: 0, schedule: 0, delegate: 0, eliminate: 0 };
  activeTasks.filter((t) => !t.parentId).forEach((t) => {
    const q = t.urgency === 'high' && t.importance === 'high' ? 'do'
      : t.urgency === 'low' && t.importance === 'high' ? 'schedule'
      : t.urgency === 'high' && t.importance === 'low' ? 'delegate' : 'eliminate';
    quadCounts[q]++;
    if (t.status === 'done') quadDone[q]++;
  });

  const quadLabels: Record<string, string> = { do: '立即执行', schedule: '计划安排', delegate: '委托处理', eliminate: '尽量减少' };
  const quadColors: Record<string, string> = { do: '#EC4899', schedule: '#7C3AED', delegate: '#FB923C', eliminate: '#A8A4BE' };

  // Last 7 days completion trend
  const last7Days: { date: string; total: number; done: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dayTasks = activeTasks.filter((t) => !t.parentId && t.dateType === 'point' && t.startDate === ds);
    last7Days.push({ date: ds, total: dayTasks.length, done: dayTasks.filter((t) => t.status === 'done').length });
  }
  const maxTotal = Math.max(...last7Days.map((d) => d.total), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" />
      <div className="relative z-10 w-[36rem] max-h-[82vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-[24px] shadow-warm-xl p-7 anim-scale-in dew-highlight" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-violet-50">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-violet-900">统计面板</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Overall stats */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-[16px] bg-gradient-to-br from-violet-50 to-pink-50 p-5 text-center">
            <div className="text-3xl font-bold text-violet-700 mb-1">{overallRate}%</div>
            <div className="text-xs text-violet-400">总完成率</div>
            <div className="text-xs text-violet-300 mt-1">{doneAll}/{totalAll} 项</div>
          </div>
          <div className="rounded-[16px] bg-gradient-to-br from-teal-50 to-green-50 p-5 text-center">
            <div className="text-3xl font-bold text-teal-600 mb-1">{todayRate}%</div>
            <div className="text-xs text-teal-400">今日完成率</div>
            <div className="text-xs text-teal-300 mt-1">{todayDone}/{todayTasks.length} 项</div>
          </div>
        </div>

        {/* Quadrant distribution */}
        <div className="rounded-[16px] bg-violet-50/30 p-5 mb-5">
          <h4 className="text-sm font-bold text-violet-800 mb-4">象限分布</h4>
          <div className="space-y-3">
            {(['do', 'schedule', 'delegate', 'eliminate'] as const).map((q) => (
              <div key={q}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-violet-600">{quadLabels[q]}</span>
                  <span className="text-xs text-violet-400">
                    {quadDone[q]}/{quadCounts[q]}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-violet-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: quadCounts[q] > 0 ? `${Math.round((quadDone[q] / quadCounts[q]) * 100)}%` : '0%',
                      background: quadColors[q],
                      opacity: quadCounts[q] > 0 ? 1 : 0.1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-day trend */}
        <div className="rounded-[16px] bg-violet-50/30 p-5">
          <h4 className="text-sm font-bold text-violet-800 mb-4">7 日趋势</h4>
          <div className="flex items-end gap-2 h-[5rem]">
            {last7Days.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse" style={{ height: '4rem' }}>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: maxTotal > 0 ? `${(day.total / maxTotal) * 100}%` : '0%',
                      background: day.done / Math.max(day.total, 1) > 0.5 ? '#7C3AED' : '#FCE7F3',
                      minHeight: day.total > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="text-[10px] text-violet-300">{new Date(day.date).getDate()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
