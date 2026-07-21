import { useState, useEffect } from 'react';
import { useTaskStore } from './store/taskStore';
import { useSettingsStore } from './store/settingsStore';
import Header from './components/Header';
import NewTaskForm from './components/NewTaskForm';
import TaskList from './components/TaskList';
import QuadrantView from './components/QuadrantView';
import Calendar from './components/Calendar';
import SettingsPanel from './components/SettingsPanel';
import CabinetDrawer from './components/CabinetDrawer';
import Decorations from './components/Decorations';

function App() {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fontSize = useSettingsStore((s) => s.fontSize);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-base', `${fontSize}px`);
  }, [fontSize]);

  const rootTasks = tasks.filter((t) => !t.parentId && !t.isTrashed);
  const totalTasks = rootTasks.length;
  const doneTasks = rootTasks.filter((t) => t.status === 'done').length;

  const openEditDrawer = (id: string) => {
    setEditingTaskId(id);
    setShowNewTask(true);
  };

  const closeDrawer = () => {
    setEditingTaskId(null);
    setShowNewTask(false);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <Decorations />

      <Header
        totalTasks={totalTasks}
        doneTasks={doneTasks}
        onSettingsClick={() => setShowSettings(!showSettings)}
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className="w-1/2 flex flex-col p-6 overflow-hidden">
          <TaskList onEdit={openEditDrawer} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>

        <div className="w-px bg-gradient-to-b from-violet-100/20 via-violet-100/40 to-pink-100/20" />

        <div className="w-1/2 flex flex-col gap-5 p-6 overflow-hidden">
          <div className="flex-[1.2] min-h-0">
            <QuadrantView onEdit={openEditDrawer} />
          </div>
          <div className="flex-1 min-h-0">
            <Calendar />
          </div>
        </div>
      </div>

      {/* FAB — 新建任务 */}
      <button
        onClick={() => { setEditingTaskId(null); setShowNewTask(true); }}
        className="fixed left-8 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.97] hover:shadow-warm-xl anim-slide-left"
        style={{
          bottom: '7.5rem',
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.28), 0 2px 10px rgba(236, 72, 153, 0.15)',
        }}
        title="新建任务"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 存储柜 button */}
      <button
        onClick={() => setShowCabinet(true)}
        className="fixed bottom-6 left-8 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.97] hover:shadow-warm-xl anim-slide-left"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)',
        }}
        title="存储柜"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </button>

      {/* New task drawer */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in">
          <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative z-10 w-[32rem] h-[96vh] anim-scale-in">
            <NewTaskForm editingTaskId={editingTaskId} onDone={closeDrawer} />
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Cabinet drawer */}
      {showCabinet && (
        <CabinetDrawer onEdit={openEditDrawer} onClose={() => setShowCabinet(false)} />
      )}
    </div>
  );
}

export default App;
