import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  fontSize: number; // px, default 18
  showCompleted: boolean;
  setFontSize: (size: number) => void;
  setShowCompleted: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 18,
      showCompleted: true,
      setFontSize: (size) => set({ fontSize: size }),
      setShowCompleted: (show) => set({ showCompleted: show }),
    }),
    { name: 'hudiequan-settings' }
  )
);
