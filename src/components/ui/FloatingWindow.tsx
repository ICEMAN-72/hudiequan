import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface FloatingWindowProps {
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  /** 宽度（px），默认 736 */
  width?: number;
  /** 记住上次拖到的位置 */
  storageKey?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const MARGIN = 10;

function clampPos(x: number, y: number, w: number, h: number) {
  const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

/**
 * 可拖动的非模态浮窗。
 *
 * 和 Modal 的根本区别：**没有遮罩、不锁滚动、不拦点击**。
 * 用它是为了让用户一边看浮窗、一边操作下面的主界面 —— 比如对着任务列表
 * 把灵感逐条转成任务。Modal 的遮罩会把主界面压暗，那点「看得见但摸不着」
 * 的差别，正好让对照这件事变得别扭。
 */
export default function FloatingWindow({
  onClose,
  title,
  subtitle,
  icon,
  iconBg,
  width = 736,
  storageKey,
  children,
  footer,
}: FloatingWindowProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [pos, setPos] = useState(() => {
    const w = Math.min(width, window.innerWidth - MARGIN * 2);
    const h = Math.min(520, window.innerHeight * 0.62);

    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as { x?: number; y?: number };
          if (typeof saved.x === 'number' && typeof saved.y === 'number') {
            return clampPos(saved.x, saved.y, w, h);
          }
        }
      } catch {
        /* 位置记不住无所谓 */
      }
    }

    return {
      // 默认贴右：任务列表和周期任务都在左列，浮窗放右边才能「对着任务」记东西
      x: Math.max(MARGIN, window.innerWidth - w - 26),
      y: Math.max(MARGIN, Math.round((window.innerHeight - h) / 2) + 18),
    };
  });

  const remember = useCallback(
    (next: { x: number; y: number }) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  /* 视口变了要把它拉回来，否则窗口会挂在屏幕外面再也拖不到。
     首帧也跑一次：初始位置是按估算高度算的，便签一多窗口会长高，得重新夹一遍。 */
  useEffect(() => {
    const fix = () => {
      const el = sheetRef.current;
      if (!el) return;
      setPos((p) => {
        const next = clampPos(p.x, p.y, el.offsetWidth, el.offsetHeight);
        return next.x === p.x && next.y === p.y ? p : next;
      });
    };
    fix();
    window.addEventListener('resize', fix);
    return () => window.removeEventListener('resize', fix);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // 标题栏里的按钮（关闭）不触发拖动
    if ((e.target as HTMLElement).closest('button')) return;
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    setDragging(true);
  };

  /* move / up 挂在 window 上，而不是靠 setPointerCapture：
     鼠标甩得快时指针会瞬间离开标题栏，capture 一旦没拿到就整段拖动失效；
     挂 window 则只要还按着就一定跟手。 */
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      if (!dragOffset.current) return;
      const el = sheetRef.current;
      const w = el?.offsetWidth ?? width;
      const h = el?.offsetHeight ?? 480;
      setPos(
        clampPos(e.clientX - dragOffset.current.dx, e.clientY - dragOffset.current.dy, w, h)
      );
    };
    const onUp = () => {
      if (!dragOffset.current) return;
      dragOffset.current = null;
      setDragging(false);
      // 松手才记位置：拖动过程中每帧写 localStorage 没有意义
      setPos((p) => {
        remember(p);
        return p;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, remember, width]);

  return (
    <div
      ref={sheetRef}
      className="floating-window dialog-sheet dialog-panel anim-sheet-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: `min(${width}px, calc(100vw - 1.5rem))`,
      }}
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <div
        className={`dialog-header floating-window-grip ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
      >
        <div className="flex items-start gap-3.5">
          {icon && (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-warm"
              style={{ background: iconBg ?? 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}
            >
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            {title && <h2 className="fs-lg font-bold text-violet-900 leading-tight">{title}</h2>}
            {subtitle && <p className="fs-xs text-violet-400 mt-1">{subtitle}</p>}
          </div>
          <span className="floating-window-hint fs-2xs shrink-0 mt-1 flex items-center gap-1">
            <svg className="w-[0.7rem] h-[0.7rem]" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <circle cx="6" cy="4" r="1.15" />
              <circle cx="10" cy="4" r="1.15" />
              <circle cx="6" cy="8" r="1.15" />
              <circle cx="10" cy="8" r="1.15" />
              <circle cx="6" cy="12" r="1.15" />
              <circle cx="10" cy="12" r="1.15" />
            </svg>
            可拖动
          </span>
          <button onClick={onClose} aria-label="关闭" className="icon-btn w-9 h-9 shrink-0 -mr-1">
            <svg className="w-[1.05rem] h-[1.05rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="dialog-body scroll-thin">{children}</div>

      {footer && <div className="dialog-footer">{footer}</div>}
    </div>
  );
}
