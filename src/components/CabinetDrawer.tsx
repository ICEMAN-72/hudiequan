import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import TaskNode from './TaskNode';

interface CabinetDrawerProps {
  onEdit: (id: string) => void;
  onClose: () => void;
}

export default function CabinetDrawer({ onEdit, onClose }: CabinetDrawerProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const [tab, setTab] = useState<'done' | 'trash'>('done');

  const doneTasks = tasks.filter((t) => t.status === 'done' && !t.isTrashed && !t.parentId);
  const trashedTasks = tasks.filter((t) => t.isTrashed && !t.parentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in">
      <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[32rem] h-[80vh] bg-white/95 backdrop-blur-sm rounded-[28px] shadow-warm-xl flex flex-col anim-scale-in dew-highlight">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-stone-50" style={{ background: 'linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)' }}>
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-violet-900">存储柜</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-7 pb-4 shrink-0">
          <button onClick={() => setTab('done')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'done' ? 'bg-pink-50 text-pink-600' : 'text-violet-400 hover:text-violet-600'}`}>
            已完成 {doneTasks.length > 0 && `(${doneTasks.length})`}
          </button>
          <button onClick={() => setTab('trash')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === 'trash' ? 'bg-stone-50 text-stone-600' : 'text-violet-400 hover:text-violet-600'}`}>
            已删除 {trashedTasks.length > 0 && `(${trashedTasks.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-3">
          {tab === 'done' && (doneTasks.length === 0 ? (
            <p className="text-sm text-violet-200 text-center py-12">暂无已完成任务</p>
          ) : (
            doneTasks.map((task) => <TaskNode key={task.id} task={task} depth={0} allTasks={tasks} onEdit={onEdit} />)
          ))}
          {tab === 'trash' && (trashedTasks.length === 0 ? (
            <p className="text-sm text-violet-200 text-center py-12">回收站空空如也</p>
          ) : (
            trashedTasks.map((task) => <TaskNode key={task.id} task={task} depth={0} allTasks={tasks} onEdit={onEdit} />)
          ))}
        </div>
      </div>
    </div>
  );
}
