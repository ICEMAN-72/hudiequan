import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { todayStr } from '../lib/date';

const FIRED_KEY = 'hudiequan-review-fired';

function firedToday(): boolean {
  return localStorage.getItem(FIRED_KEY) === todayStr();
}

/**
 * 每日复盘定时器。
 *
 * 之前 settingsStore 里有 reviewEnabled / reviewTime，设置面板也画了开关，
 * 但整个应用没有一行定时器代码 —— 开关点了没有任何效果。
 *
 * 这里用 30 秒轮询而不是精确 setTimeout：
 * - 页面可能被挂起、休眠、切到后台，setTimeout 会漂移
 * - 轮询只比较「当前时间是否已过设定时刻」，错过也能补上
 */
export function useDailyReview(): { open: boolean; close: () => void } {
  const enabled = useSettingsStore((s) => s.reviewEnabled);
  const reviewTime = useSettingsStore((s) => s.reviewTime);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      if (firedToday()) return;
      const [h, m] = reviewTime.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      // 只补触发 2 小时内的，避免半夜打开页面突然弹窗
      if (now < target) return;
      if (now.getTime() - target.getTime() > 2 * 60 * 60 * 1000) {
        localStorage.setItem(FIRED_KEY, todayStr());
        return;
      }
      localStorage.setItem(FIRED_KEY, todayStr());
      setOpen(true);
    };

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, reviewTime]);

  const close = () => setOpen(false);
  return { open, close };
}
