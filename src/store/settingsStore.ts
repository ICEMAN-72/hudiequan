import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number;
  showCompleted: boolean;
  darkMode: boolean;
  reviewEnabled: boolean;
  reviewTime: string;
  /** 每日自动把任务写一份 JSON 到用户选定的文件夹 */
  autoBackupEnabled: boolean;
  setFontSize: (size: number) => void;
  setShowCompleted: (show: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setReviewEnabled: (enabled: boolean) => void;
  setReviewTime: (time: string) => void;
  setAutoBackupEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      showCompleted: true,
      darkMode: false,
      reviewEnabled: true,
      reviewTime: '17:30',
      autoBackupEnabled: false,
      setFontSize: (size) => set({ fontSize: size }),
      setShowCompleted: (show) => set({ showCompleted: show }),
      setDarkMode: (dark) => set({ darkMode: dark }),
      setReviewEnabled: (enabled) => set({ reviewEnabled: enabled }),
      setReviewTime: (time) => set({ reviewTime: time }),
      setAutoBackupEnabled: (enabled) => set({ autoBackupEnabled: enabled }),
    }),
    { name: 'hudiequan-settings' }
  )
);
