interface BatchBarProps {
  count: number;
  onComplete: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export default function BatchBar({ count, onComplete, onDelete, onClear }: BatchBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 bg-white/95 backdrop-blur-sm rounded-full shadow-warm-xl anim-slide-up border border-violet-100/40">
      <span className="text-sm font-bold text-violet-800">{count} 项已选</span>
      <div className="h-[1.1rem] w-px bg-violet-100/40" />
      <button onClick={onComplete}
        className="px-4 py-1.5 rounded-full text-xs font-bold text-white transition-colors"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
        完成
      </button>
      <button onClick={onDelete}
        className="px-4 py-1.5 rounded-full text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors">
        删除
      </button>
      <button onClick={onClear}
        className="px-4 py-1.5 rounded-full text-xs font-bold text-violet-500 bg-violet-50 hover:bg-violet-100 transition-colors">
        取消
      </button>
    </div>
  );
}
