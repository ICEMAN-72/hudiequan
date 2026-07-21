import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, DateType, SortOption, RecurrenceType } from '../types';
import { getDescendantIds, isDescendantOf, NEXT_STATUS } from '../types';

interface TaskState {
  tasks: Task[];
  sortBy: SortOption;
  addTask: (
    title: string,
    urgency: Task['urgency'],
    importance: Task['importance'],
    dateType?: DateType,
    startDate?: string,
    endDate?: string,
    notes?: string,
    recurrence?: RecurrenceType
  ) => void;
  addSubTask: (parentId: string, title: string) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'urgency' | 'importance' | 'status' | 'dateType' | 'startDate' | 'endDate' | 'notes' | 'recurrence'>>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  moveTask: (id: string, newParentId: string | undefined) => void;
  cycleStatus: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  setSortBy: (sort: SortOption) => void;
  batchDelete: (ids: string[]) => void;
  batchComplete: (ids: string[]) => void;
  batchMoveQuadrant: (ids: string[], urgency: Task['urgency'], importance: Task['importance']) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      sortBy: 'default' as SortOption,

      addTask: (title, urgency, importance, dateType = 'none', startDate, endDate, notes, recurrence = 'none') => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          urgency,
          importance,
          status: 'todo',
          dateType,
          startDate: dateType !== 'none' ? startDate : undefined,
          endDate: dateType === 'range' ? endDate : undefined,
          notes: notes?.trim() || undefined,
          recurrence: recurrence !== 'none' ? recurrence : undefined,
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

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTask: (id) => {
        const idsToTrash = new Set([id, ...getDescendantIds(id, get().tasks)]);
        set((state) => ({ tasks: state.tasks.map((t) =>
          idsToTrash.has(t.id) ? { ...t, isTrashed: true } : t
        ) }));
      },

      restoreTask: (id) => {
        const idsToRestore = new Set([id, ...getDescendantIds(id, get().tasks)]);
        set((state) => ({ tasks: state.tasks.map((t) =>
          idsToRestore.has(t.id) ? { ...t, isTrashed: false } : t
        ) }));
      },

      permanentlyDelete: (id) => {
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
        const task = get().tasks.find((t) => t.id === id);
        const nextStatus = task ? NEXT_STATUS[task.status] : 'todo';
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: nextStatus } : t
          ),
        }));
        // If completing a recurring task, create next instance
        if (task && nextStatus === 'done' && task.recurrence && task.recurrence !== 'none' && !task.recurrenceId) {
          let nextStart: string | undefined;
          if (task.startDate) {
            const d = new Date(task.startDate);
            if (task.recurrence === 'daily') d.setDate(d.getDate() + 1);
            else if (task.recurrence === 'weekly') d.setDate(d.getDate() + 7);
            else if (task.recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
            nextStart = d.toISOString().slice(0, 10);
          }
          let nextEnd: string | undefined;
          if (nextStart && task.startDate && task.endDate) {
            const diff = new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
            nextEnd = new Date(new Date(nextStart).getTime() + diff).toISOString().slice(0, 10);
          }
          const next: Task = {
            id: crypto.randomUUID(),
            title: task.title,
            urgency: task.urgency,
            importance: task.importance,
            status: 'todo' as const,
            dateType: task.dateType,
            startDate: nextStart,
            endDate: nextEnd,
            notes: task.notes,
            recurrence: task.recurrence,
            recurrenceId: task.recurrenceId || task.id,
            createdAt: Date.now(),
          };
          set((state) => ({ tasks: [...state.tasks, next] }));
        }
      },

      setTasks: (tasks) => set({ tasks }),
      setSortBy: (sort) => set({ sortBy: sort }),

      batchDelete: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({ tasks: state.tasks.map((t) => idSet.has(t.id) ? { ...t, isTrashed: true } : t) }));
      },
      batchComplete: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({ tasks: state.tasks.map((t) => idSet.has(t.id) ? { ...t, status: 'done' as const } : t) }));
      },
      batchMoveQuadrant: (ids, urgency, importance) => {
        const idSet = new Set(ids);
        set((state) => ({ tasks: state.tasks.map((t) => idSet.has(t.id) ? { ...t, urgency, importance } : t) }));
      },
    }),
    {
      name: 'hudiequan-tasks',
      version: 4,
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
              isTrashed: false,
            };
          }) as Task[];
          return { tasks: migrated, sortBy: 'default' as SortOption };
        }
        if (version < 3) {
          const state = persistedState as { tasks: unknown[] };
          const migrated = (state.tasks as Task[]).map((t) => ({ ...t, isTrashed: false }));
          return { tasks: migrated, sortBy: 'default' as SortOption };
        }
        if (version < 4) {
          const state = persistedState as { tasks: unknown[] };
          const migrated = (state.tasks as Task[]).map((t) => ({ ...t, notes: undefined, recurrence: undefined }));
          return { tasks: migrated, sortBy: (state as TaskState).sortBy || 'default' as SortOption };
        }
        return persistedState as TaskState;
      },
    }
  )
);
