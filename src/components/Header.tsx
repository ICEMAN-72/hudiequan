interface HeaderProps {
  totalTasks: number;
  doneTasks: number;
  onSettingsClick: () => void;
}

/** Cute butterfly mark — rounder, softer wings with little antennae */
function ButterflyMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Left upper wing — violet */}
      <path d="M16 9C13 6 6 6.5 6 12.5C6.5 16 11 15 16 12" fill="#7C3AED" opacity="0.85" />
      {/* Right upper wing — pink */}
      <path d="M16 9C19 6 26 6.5 26 12.5C25.5 16 21 15 16 12" fill="#EC4899" opacity="0.85" />
      {/* Left lower wing — soft violet */}
      <path d="M16 13.5C14 16.5 8 19 8.5 16C9 14.5 13 13.5 16 13.5" fill="#7C3AED" opacity="0.35" />
      {/* Right lower wing — soft pink */}
      <path d="M16 13.5C18 16.5 24 19 23.5 16C23 14.5 19 13.5 16 13.5" fill="#EC4899" opacity="0.35" />
      {/* Body */}
      <ellipse cx="16" cy="11" rx="1.2" ry="5.5" fill="#5B5876" />
      {/* Antennae */}
      <path d="M15 7 Q13 4 12.5 3.5" stroke="#5B5876" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <circle cx="12.5" cy="3.5" r="0.8" fill="#7C3AED" opacity="0.6" />
      <path d="M17 7 Q19 4 19.5 3.5" stroke="#5B5876" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <circle cx="19.5" cy="3.5" r="0.8" fill="#EC4899" opacity="0.6" />
    </svg>
  );
}

export default function Header({ totalTasks, doneTasks, onSettingsClick }: HeaderProps) {
  return (
    <header className="relative z-30 h-[4rem] px-6 flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-violet-50/40 shadow-warm shrink-0">
      {/* Logo + Title */}
      <div className="flex items-center gap-3.5">
        <ButterflyMark size={32} />
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-bold text-violet-900 tracking-tight">
            蝴蝶泉
          </h1>
          <span className="text-xs text-violet-300 tracking-wide">
            任务管理
          </span>
        </div>
      </div>

      {/* Right side: Stats + Settings */}
      <div className="flex items-center gap-5">
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-200" />
            <span className="text-violet-500 font-medium tabular-nums">{totalTasks}</span>
            <span className="text-violet-300">总计</span>
          </div>
          {doneTasks > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
              <span className="text-pink-600 font-medium tabular-nums">{doneTasks}</span>
              <span className="text-violet-300">已完成</span>
            </div>
          )}
          {totalTasks > 0 && (
            <div className="text-xs text-violet-300 tabular-nums">
              {Math.round((doneTasks / totalTasks) * 100)}%
            </div>
          )}
        </div>

        {/* Settings gear — warm */}
        <button
          onClick={onSettingsClick}
          className="w-[2.4rem] h-[2.4rem] flex items-center justify-center rounded-full text-violet-400 hover:text-violet-600 hover:bg-violet-50/60 transition-colors"
          title="设置"
        >
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
