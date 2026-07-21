import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number;
  showCompleted: boolean;
  darkMode: boolean;
  setFontSize: (size: number) => void;
  setShowCompleted: (show: boolean) => void;
  setDarkMode: (dark: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      showCompleted: true,
      darkMode: false,
      setFontSize: (size) => set({ fontSize: size }),
      setShowCompleted: (show) => set({ showCompleted: show }),
      setDarkMode: (dark) => set({ darkMode: dark }),
    }),
    { name: 'hudiequan-settings' }
  )
);
