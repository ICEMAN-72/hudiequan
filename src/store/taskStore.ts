import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, DateType } from '../types';
import { getDescendantIds, isDescendantOf, NEXT_STATUS } from '../types';

interface TaskState {
  tasks: Task[];
  addTask: (
    title: string,
    urgency: Task['urgency'],
    importance: Task['importance'],
    dateType?: DateType,
    startDate?: string,
    endDate?: string
  ) => void;
  addSubTask: (parentId: string, title: string) => void;
  addTasksFromClipboard: (lines: string[], urgency: Task['urgency'], importance: Task['importance']) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'urgency' | 'importance' | 'status' | 'dateType' | 'startDate' | 'endDate'>>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newParentId: string | undefined) => void;
  cycleStatus: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (title, urgency, importance, dateType = 'none', startDate, endDate) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          urgency,
          importance,
          status: 'todo',
          dateType,
          startDate: dateType !== 'none' ? startDate : undefined,
          endDate: dateType === 'range' ? endDate : undefined,
          createdAt: Date.now(),
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
      },

      addSubTask: (parentId, title) => {
        const parent = get().tasks.find((t) => t.id === parentId);
        if (!parent) return;
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          urgency: parent.urgency,
          importance: parent.importance,
          status: 'todo',
          parentId,
          createdAt: Date.now(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      addTasksFromClipboard: (lines, urgency, importance) => {
        const newTasks: Task[] = lines.map((line) => ({
          id: crypto.randomUUID(),
          title: line,
          urgency,
          importance,
          status: 'todo' as const,
          dateType: 'none' as DateType,
          createdAt: Date.now(),
        }));
        set((state) => ({ tasks: [...newTasks, ...state.tasks] }));
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTask: (id) => {
        const idsToDelete = new Set([id, ...getDescendantIds(id, get().tasks)]);
        set((state) => ({ tasks: state.tasks.filter((t) => !idsToDelete.has(t.id)) }));
      },

      moveTask: (id, newParentId) => {
        if (newParentId && isDescendantOf(newParentId, id, get().tasks)) return;
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, parentId: newParentId } : t
          ),
        }));
      },

      cycleStatus: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: NEXT_STATUS[t.status] } : t
          ),
        }));
      },

      setTasks: (tasks) => set({ tasks }),
    }),
    {
      name: 'hudiequan-tasks',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const state = persistedState as { tasks: unknown[] };
          const migrated = state.tasks.map((t) => {
            const old = t as Record<string, unknown>;
            return {
              id: old.id as string,
              title: old.title as string,
              urgency: old.urgency as Task['urgency'],
              importance: old.importance as Task['importance'],
              status: (old.status as Task['status']) ?? (old.completed ? 'done' : 'todo'),
              parentId: old.parentId as string | undefined,
              dateType: 'none' as DateType,
              startDate: undefined,
              endDate: undefined,
              createdAt: old.createdAt as number,
            };
          }) as Task[];
          return { tasks: migrated };
        }
        return persistedState as TaskState;
      },
    }
  )
);
