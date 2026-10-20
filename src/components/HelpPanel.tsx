import Modal from './ui/Modal';

interface HelpPanelProps {
  onClose: () => void;
}

export default function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <Modal
      onClose={onClose}
      width="34rem"
      title="使用指南"
      subtitle="四个面板各管一段，串起来就是完整的节奏"
      icon={
        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    >
      <div className="space-y-3 stagger">
        <Section icon="📋" title="任务列表 · 左上" desc="一次性任务的集合。点击圆圈切换「待办 → 进行中 → 完成」。按住拖动到另一个任务上，就变成它的子任务。Ctrl / ⌘ + 点击可多选，底部会浮出批量操作栏。" />
        <Section icon="🎯" title="四象限 · 右上" desc="按紧急 / 重要自动分成四格。把任务卡从一个格子拖到另一个格子，属性会跟着改。周期任务不会出现在这里。" />
        <Section icon="🔄" title="周期任务 · 左下" desc="每天 / 每周 / 每月重复的事放这里。完成本期后，下一期会在目标周期的第一天自动出现：每天是明天、每周是下周一、每月是下月 1 号。点右上角「历史」可以回看往期。" />
        <Section icon="📅" title="日历 · 右下" desc="月视图看整体疏密，圆点是时间点任务、横条是跨天的时间段任务。周视图排一周日程，日视图是当天清单。" />
        <Section icon="➕" title="新建任务" desc="右下角的圆形按钮。标题、象限、时间、备注、周期都在同一个表单里。Ctrl + Enter 直接保存，Esc 取消。" />
        <Section icon="🗄" title="存储柜" desc="顶栏的抽屉图标。放着已完成和已删除的任务，可以还原或彻底删除。" />
        <Section icon="☁" title="云端同步" desc="顶栏的云图标。登录后在多台设备间同步任务，首次登录会把本机数据上传到云端。" />

        <div className="rounded-[16px] bg-violet-50/40 p-5 mt-1">
          <h4 className="fs-sm font-bold text-violet-800 mb-3">⌨ 快捷键</h4>
          <div className="space-y-2 fs-xs text-violet-600">
            <Kbd label="Ctrl + Enter" desc="保存任务" />
            <Kbd label="Esc" desc="关闭当前弹窗" />
            <Kbd label="Ctrl + 点击" desc="多选任务，批量完成或删除" />
            <Kbd label="拖到另一象限" desc="切换任务的象限归属" />
            <Kbd label="拖到另一任务上" desc="嵌套为子任务" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Section({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-[16px] px-4 py-3.5 surface-card shadow-warm">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="fs-sm">{icon}</span>
        <h4 className="fs-sm font-bold text-violet-800">{title}</h4>
      </div>
      <p className="fs-xs text-violet-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Kbd({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-block px-2 py-0.5 rounded-md bg-white text-violet-500 font-mono fs-2xs shadow-warm whitespace-nowrap">{label}</span>
      <span className="text-violet-400">{desc}</span>
    </div>
  );
}
