import { create } from 'zustand';
import { todayStr } from '../lib/date';

/**
 * 「今天」的单一来源。
 *
 * 为什么要单独搞一个 store：悬置天数是「今天 - 创建日」，
 * 页面开着过零点时如果没人喊一声，所有任务的天数会集体停在昨天，
 * 日历里的「今天」高亮也不会移动。每 60 秒对一次表即可，
 * 60 秒的误差对「天」这个量级完全无所谓。
 */
const useTodayStore = create<{ today: string }>(() => ({ today: todayStr() }));

export function useToday(): string {
  return useTodayStore((s) => s.today);
}

if (typeof window !== 'undefined') {
  setInterval(() => {
    const next = todayStr();
    if (useTodayStore.getState().today !== next) {
      useTodayStore.setState({ today: next });
    }
  }, 60_000);
}
