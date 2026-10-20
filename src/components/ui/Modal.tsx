import { useEffect, useRef, type ReactNode } from 'react';

type Align = 'center' | 'right';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** 卡片宽度，支持任意 CSS 长度，默认 34rem */
  width?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** 图标底板背景，默认淡紫 */
  iconBg?: string;
  /** 头部右侧、标题之后的额外操作 */
  headerExtra?: ReactNode;
  /** 固定在 header 与 body 之间的副标题区（例如 tab 栏），不随内容滚动 */
  subHeader?: ReactNode;
  footer?: ReactNode;
  align?: Align;
  /** body 的额外 class（例如去掉默认 padding） */
  bodyClassName?: string;
}

/**
 * 统一的呼出容器。
 *
 * 关键设计：圆角只在外壳上，内容区是独立的滚动容器并带足内边距，
 * 所以无论内容多长，都不会滚到圆角边缘被裁掉 —— 这是之前
 * `rounded-[24px] + p-7 + overflow-y-auto` 同元素叠加导致的老问题。
 *
 * 另外 header 固定不滚，标题始终可见。
 */
export default function Modal({
  onClose,
  children,
  width = '34rem',
  title,
  subtitle,
  icon,
  iconBg,
  headerExtra,
  subHeader,
  footer,
  align = 'center',
  bodyClassName = '',
}: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

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

  // 呼出时锁住背景滚动，避免滚轮穿透到下面的四宫格
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isRight = align === 'right';

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isRight ? 'items-center justify-end pr-4 sm:pr-6' : 'items-center justify-center px-4'
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-violet-900/15 backdrop-blur-[3px] anim-backdrop-in"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className={`dialog-sheet relative z-10 ${isRight ? 'anim-drawer-in' : 'anim-sheet-in'}`}
        style={{ width: `min(${width}, calc(100vw - 2.5rem))` }}
      >
        {(title || icon || headerExtra) && (
          <div className="dialog-header">
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
              {headerExtra}
              <button
                onClick={onClose}
                aria-label="关闭"
                className="icon-btn w-9 h-9 shrink-0 -mr-1"
              >
                <svg className="w-[1.05rem] h-[1.05rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {subHeader && <div className="shrink-0 px-6 pb-3">{subHeader}</div>}

        <div className={`dialog-body scroll-thin ${bodyClassName}`}>{children}</div>

        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
