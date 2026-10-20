import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Task, DateType, SortOption, RecurrenceType, Quadrant } from '../types';
import { getDescendantIds, isDescendantOf, NEXT_STATUS } from '../types';
import { safeTaskStorage } from '../lib/safeStorage';
import { nextOccurrence } from '../lib/date';

/** 进入/离开 done 时维护 finishedAt，统计口径全靠它 */
function withStatus(task: Task, status: Task['status']): Task {
  if (status === 'done') {
    return { ...task, status, finishedAt: task.finishedAt ?? Date.now() };
  }
  if (task.finishedAt === undefined) return { ...task, status };
  return { ...task, status, finishedAt: undefined };
}

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
  batchMoveToQuadrant: (ids: string[], quadrant: Quadrant) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      sortBy: 'default' as SortOption,

      addTask: (title, urgency, importance, dateType = 'none', startDate, endDate, notes, recurrence = 'none') => {
        const id = crypto.randomUUID();
        const isRecurring = recurrence !== 'none';
        const task: Task = {
          id,
          title,
          urgency,
          importance,
          status: 'todo',
          dateType,
          startDate: dateType !== 'none' ? startDate : undefined,
          endDate: dateType === 'range' ? endDate : undefined,
          notes: notes?.trim() || undefined,
          recurrence: isRecurring ? recurrence : undefined,
          // 周期任务以自身 id 作为模板身份，后续每期沿用
          templateId: isRecurring ? id : undefined,
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
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            if (updates.status !== undefined && updates.status !== t.status) {
              const { status, ...rest } = updates;
              return withStatus({ ...t, ...rest }, status);
            }
            return { ...t, ...updates };
          }),
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
        if (!task) return;
        const nextStatus = NEXT_STATUS[task.status];

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? withStatus(t, nextStatus) : t)),
        }));

        // 周期任务完成 → 归档本期，并生成下一期（下期只有到达所属周期才有意义，
        // 所以总是落在目标周期第一天：明天 / 下周一 / 下月 1 号）
        if (nextStatus !== 'done' || !task.recurrence || task.recurrence === 'none') return;

        const templateId = task.templateId ?? task.id;
        const all = get().tasks;

        // 同一模板下若已有未完成实例，不重复生成，避免反复勾选导致重复堆积
        const hasOpenInstance = all.some(
          (t) => t.templateId === templateId && t.id !== task.id && t.status !== 'done' && !t.isTrashed
        );
        if (hasOpenInstance) return;

        // 本期若不携带 templateId（旧数据），顺手补上，让历史可归组
        if (!task.templateId) {
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, templateId } : t)),
          }));
        }

        const nextDate = nextOccurrence(task.recurrence, task.startDate);
        const nextId = crypto.randomUUID();
        const next: Task = {
          id: nextId,
          title: task.title,
          urgency: task.urgency,
          importance: task.importance,
          status: 'todo',
          dateType: 'point',
          startDate: nextDate,
          notes: task.notes,
          recurrence: task.recurrence,
          templateId,
          createdAt: Date.now(),
        };

        // 子任务跟着复制到下期，保持结构一致
        const children = all.filter((c) => c.parentId === task.id && !c.isTrashed);
        const clonedChildren: Task[] = children.map((c) => ({
          ...c,
          id: crypto.randomUUID(),
          parentId: nextId,
          status: 'todo',
          finishedAt: undefined,
          isTrashed: false,
          createdAt: Date.now(),
        }));

        set((state) => ({ tasks: [...state.tasks, next, ...clonedChildren] }));
      },

      setTasks: (tasks) => set({ tasks }),
      setSortBy: (sort) => set({ sortBy: sort }),

      batchDelete: (ids) => {
        const all = get().tasks;
        const idSet = new Set<string>();
        // 级联：删除父级时子任务一并进存储柜，否则会留下 parentId 悬空的孤儿
        for (const id of ids) {
          idSet.add(id);
          for (const childId of getDescendantIds(id, all)) idSet.add(childId);
        }
        set((state) => ({
          tasks: state.tasks.map((t) => (idSet.has(t.id) ? { ...t, isTrashed: true } : t)),
        }));
      },
      batchComplete: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          tasks: state.tasks.map((t) => (idSet.has(t.id) ? withStatus(t, 'done') : t)),
        }));
      },
      batchMoveQuadrant: (ids, urgency, importance) => {
        const idSet = new Set(ids);
        set((state) => ({ tasks: state.tasks.map((t) => idSet.has(t.id) ? { ...t, urgency, importance } : t) }));
      },
      batchMoveToQuadrant: (ids, quadrant) => {
        const map: Record<Quadrant, { urgency: Task['urgency']; importance: Task['importance'] }> = {
          do: { urgency: 'high', importance: 'high' },
          schedule: { urgency: 'low', importance: 'high' },
          delegate: { urgency: 'high', importance: 'low' },
          eliminate: { urgency: 'low', importance: 'low' },
        };
        const target = map[quadrant];
        const idSet = new Set(ids);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            idSet.has(t.id) ? { ...t, urgency: target.urgency, importance: target.importance } : t
          ),
        }));
      },
    }),
    {
      name: 'hudiequan-tasks',
      version: 5,
      storage: createJSONStorage(() => safeTaskStorage),
      migrate: (persistedState: unknown, version: number) => {
        // 顺序累积：从任意旧版本一路补到当前版本。
        // （之前每个分支各自 return，导致 v1 用户永远拿不到 v3+ 的修复）
        const raw = (persistedState ?? {}) as { tasks?: unknown[]; sortBy?: SortOption };
        let list: Task[] = Array.isArray(raw.tasks) ? (raw.tasks as Task[]) : [];
        const sortBy = raw.sortBy || ('default' as SortOption);

        if (version < 2) {
          list = list.map((t) => {
            const old = t as unknown as Record<string, unknown>;
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
            } as Task;
          });
        }

        if (version < 3) {
          list = list.map((t) => ({ ...t, isTrashed: t.isTrashed ?? false }));
        }

        if (version < 4) {
          // 保留全部已有字段，绝不清空 notes / recurrence
          list = list.map((t) => ({ ...t }));
        }

        if (version < 5) {
          // v5：周期任务引入 templateId。旧数据没有这个字段，
          // 用「同名 + 同频率 + 同象限」启发式归组，取组内最早创建的那条作为模板身份，
          // 让历史实例能重新聚合到一起；已完成但缺 finishedAt 的用 createdAt 兜底。
          const groups = new Map<string, Task[]>();
          for (const t of list) {
            if (!t.recurrence || t.recurrence === 'none') continue;
            const key = `${t.title}|${t.recurrence}|${t.urgency}|${t.importance}`;
            const arr = groups.get(key) ?? [];
            arr.push(t);
            groups.set(key, arr);
          }
          const templateOf = new Map<string, string>();
          for (const arr of groups.values()) {
            const root = arr.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
            for (const t of arr) templateOf.set(t.id, root.id);
          }
          list = list.map((t) => {
            const tid = templateOf.get(t.id) ?? t.templateId ?? t.id;
            const finishedAt =
              t.status === 'done' && t.finishedAt === undefined ? t.createdAt : t.finishedAt;
            return { ...t, templateId: t.recurrence && t.recurrence !== 'none' ? tid : t.templateId, finishedAt };
          });
        }

        return { tasks: list, sortBy };
      },
    }
  )
);
