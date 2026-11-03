import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 速记：零散的、不是任务但怕忘的东西。
 * 报销、加班时长、要买的东西、注意事项 —— 它们没有紧急/重要之分，
 * 硬塞进四象限只会污染判断，所以单独一块。
 */
export interface QuickNote {
  id: string;
  text: string;
  createdAt: number;
  /** 处理完了打个勾，不进「已完成」，也不算任务完成率 */
  done?: boolean;
}

interface NoteState {
  notes: QuickNote[];
  addNote: (text: string) => void;
  updateNote: (id: string, text: string) => void;
  removeNote: (id: string) => void;
  toggleDone: (id: string) => void;
  /** 转成任务后从速记里移除，避免两处都能看到 */
  consumeNote: (id: string) => void;
  clearDone: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          notes: [
            { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() },
            ...state.notes,
          ],
        }));
      },

      updateNote: (id, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, text: trimmed } : n)),
        }));
      },

      removeNote: (id) => {
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
      },

      toggleDone: (id) => {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
        }));
      },

      consumeNote: (id) => {
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
      },

      clearDone: () => {
        set((state) => ({ notes: state.notes.filter((n) => !n.done) }));
      },
    }),
    {
      name: 'hudiequan-notes',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/** 未处理的条数，顶栏徽章用 */
export function countActiveNotes(notes: QuickNote[]): number {
  return notes.filter((n) => !n.done).length;
}
