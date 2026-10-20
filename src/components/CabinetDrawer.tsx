import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import TaskNode from './TaskNode';
import Modal from './ui/Modal';

interface CabinetDrawerProps {
  onEdit: (id: string) => void;
  onClose: () => void;
}

type Tab = 'done' | 'trash';

export default function CabinetDrawer({ onEdit, onClose }: CabinetDrawerProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const [tab, setTab] = useState<Tab>('done');

  const doneTasks = tasks.filter((t) => t.status === 'done' && !t.isTrashed && !t.parentId);
  const trashedTasks = tasks.filter((t) => t.isTrashed && !t.parentId);
  const list = tab === 'done' ? doneTasks : trashedTasks;
  const empty = tab === 'done' ? '还没有完成的任务' : '回收站是空的';

  return (
    <Modal
      onClose={onClose}
      width="32rem"
      align="right"
      title="存储柜"
      subtitle={tab === 'done' ? '做完的都在这儿，随时可以拖回来' : '删掉的任务还能捞回来'}
      icon={
        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      }
      subHeader={
        <div className="flex gap-1 p-0.5 bg-violet-50/60 rounded-full w-fit">
          {(['done', 'trash'] as Tab[]).map((t) => {
            const count = t === 'done' ? doneTasks.length : trashedTasks.length;
            const on = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-full fs-xs font-semibold transition-all duration-200 ${
                  on
                    ? t === 'done'
                      ? 'bg-white text-pink-600 shadow-warm'
                      : 'bg-white text-stone-600 shadow-warm'
                    : 'text-violet-400 hover:text-violet-600'
                }`}
              >
                {t === 'done' ? '已完成' : '已删除'}
                {count > 0 && <span className="ml-1 tabular-nums opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      }
    >
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="w-11 h-11 rounded-full bg-violet-50/60 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="fs-xs text-violet-300">{empty}</p>
        </div>
      ) : (
        <div className="space-y-2.5 stagger">
          {list.map((task) => (
            <TaskNode key={task.id} task={task} depth={0} allTasks={tasks} onEdit={onEdit} dimDone={false} />
          ))}
        </div>
      )}
    </Modal>
  );
}
