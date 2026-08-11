import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number;
  showCompleted: boolean;
  darkMode: boolean;
  reviewEnabled: boolean;
  reviewTime: string;
  setFontSize: (size: number) => void;
  setShowCompleted: (show: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setReviewEnabled: (enabled: boolean) => void;
  setReviewTime: (time: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      showCompleted: true,
      darkMode: false,
      reviewEnabled: true,
      reviewTime: '17:30',
      setFontSize: (size) => set({ fontSize: size }),
      setShowCompleted: (show) => set({ showCompleted: show }),
      setDarkMode: (dark) => set({ darkMode: dark }),
      setReviewEnabled: (enabled) => set({ reviewEnabled: enabled }),
      setReviewTime: (time) => set({ reviewTime: time }),
    }),
    { name: 'hudiequan-settings' }
  )
);
