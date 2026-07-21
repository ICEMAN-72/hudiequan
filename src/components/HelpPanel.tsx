interface HelpPanelProps {
  onClose: () => void;
}

export default function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[34rem] max-h-[82vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-[24px] shadow-warm-xl p-7 anim-scale-in dew-highlight"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-violet-50">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-violet-900">使用指南</h3>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <Section icon="📋" title="任务列表" desc="左侧面板。展示所有任务，支持拖拽嵌套子任务。点击任务左侧圆圈切换状态。标题右侧显示创建时间。底部存储柜存放已完成和已删除任务。" />
          <Section icon="🎯" title="四象限" desc="右上角面板。任务按紧急/重要程度自动分入四个象限。选中象限格子可直接把任务拖入切换归属。" />
          <Section icon="📅" title="任务日历" desc="右下角面板。有时间标记的任务在日历上显示圆点或色条。鼠标悬停查看当天任务详情。" />
          <Section icon="➕" title="新建任务" desc="左下角按钮打开编辑器。设置标题、象限归属、时间（可选时间点/时间段）、备注、周期。Ctrl+Enter 快速保存。" />
          <Section icon="🔍" title="搜索与排序" desc="列表上方搜索框支持模糊搜索任务名称。右侧按钮可按状态/时间/子任务数排序。" />
          <Section icon="⚙️" title="设置" desc="右上角齿轮图标。可调字体大小、深色模式、显示已完成、导出导入数据。" />

          <div className="rounded-[16px] bg-violet-50/30 p-5">
            <h4 className="text-sm font-bold text-violet-800 mb-3">⌨ 快捷键</h4>
            <div className="space-y-2 text-xs text-violet-600">
              <Kbd label="Ctrl + Enter" desc="快速保存任务" />
              <Kbd label="Esc" desc="关闭弹窗" />
              <Kbd label="Ctrl + 点击" desc="多选任务进行批量操作" />
              <Kbd label="拖拽任务到另一个象限" desc="切换象限归属" />
              <Kbd label="拖拽任务到另一个任务上" desc="嵌套为子任务" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-[16px] p-5 bg-white/70 shadow-warm">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-base">{icon}</span>
        <h4 className="text-sm font-bold text-violet-800">{title}</h4>
      </div>
      <p className="text-xs text-violet-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Kbd({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block px-2 py-0.5 rounded-md bg-white text-violet-500 font-mono text-[11px] shadow-warm">{label}</span>
      <span className="text-violet-400">{desc}</span>
    </div>
  );
}
