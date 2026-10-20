import { useState, useEffect } from 'react';
import { useTaskStore } from './store/taskStore';
import { useSettingsStore } from './store/settingsStore';
import Header from './components/Header';
import NewTaskForm from './components/NewTaskForm';
import TaskList from './components/TaskList';
import QuadrantView from './components/QuadrantView';
import Calendar from './components/Calendar';
import RecurringTasksPanel from './components/RecurringTasksPanel';
import SettingsPanel from './components/SettingsPanel';
import CabinetDrawer from './components/CabinetDrawer';
import HelpPanel from './components/HelpPanel';
import SupabasePanel from './components/SupabasePanel';
import BatchBar from './components/BatchBar';
import StatsPanel from './components/StatsPanel';
import Decorations from './components/Decorations';
import DataRecoveryBanner from './components/DataRecoveryBanner';
import type { RecurrenceType } from './types';

function App() {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSupabase, setShowSupabase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recurringMode, setRecurringMode] = useState<RecurrenceType | undefined>(undefined);

  const fontSize = useSettingsStore((s) => s.fontSize);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const tasks = useTaskStore((s) => s.tasks);
  const batchComplete = useTaskStore((s) => s.batchComplete);
  const batchDelete = useTaskStore((s) => s.batchDelete);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-base', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const rootTasks = tasks.filter((t) => !t.parentId && !t.isTrashed && !t.recurrence);
  const totalTasks = rootTasks.length;
  const doneTasks = rootTasks.filter((t) => t.status === 'done').length;

  const openEditDrawer = (id: string) => {
    setEditingTaskId(id);
    setRecurringMode(undefined);
    setShowNewTask(true);
  };
  const openRecurringDrawer = () => {
    setEditingTaskId(null);
    setRecurringMode('daily');
    setShowNewTask(true);
  };
  const closeDrawer = () => {
    setEditingTaskId(null);
    setRecurringMode(undefined);
    setShowNewTask(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const handleBatchComplete = () => { batchComplete([...selectedIds]); clearSelection(); };
  const handleBatchDelete = () => { batchDelete([...selectedIds]); clearSelection(); };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <Decorations />
      <DataRecoveryBanner />

      <Header
        totalTasks={totalTasks}
        doneTasks={doneTasks}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onHelpClick={() => setShowHelp(true)}
        onStatsClick={() => setShowStats(true)}
        onCabinetClick={() => setShowCabinet(true)}
        onCloudClick={() => setShowSupabase(true)}
      />

      {/* 2x2 四宫格布局 */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 p-4 gap-4 overflow-hidden relative z-10">
        {/* 左上：任务列表 */}
        <div className="overflow-hidden bg-white/40 rounded-[20px] p-4 shadow-warm">
          <TaskList
            onEdit={openEditDrawer}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>

        {/* 右上：四象限 */}
        <div className="overflow-hidden bg-white/40 rounded-[20px] p-4 shadow-warm">
          <QuadrantView onEdit={openEditDrawer} />
        </div>

        {/* 左下：周期任务 */}
        <div className="overflow-hidden bg-white/40 rounded-[20px] p-4 shadow-warm">
          <RecurringTasksPanel onEdit={openEditDrawer} onCreateRecurring={openRecurringDrawer} />
        </div>

        {/* 右下：日历 */}
        <div className="overflow-hidden bg-white/40 rounded-[20px] p-4 shadow-warm">
          <Calendar />
        </div>
      </div>

      {/* FAB — 右下角 */}
      <button onClick={() => { setEditingTaskId(null); setRecurringMode(undefined); setShowNewTask(true); }}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.95] hover:opacity-90 anim-slide-up"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.28), 0 2px 10px rgba(236, 72, 153, 0.15)' }}
        title="新建任务">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* Batch bar */}
      {selectedIds.size > 0 && (
        <BatchBar count={selectedIds.size} onComplete={handleBatchComplete} onDelete={handleBatchDelete} onClear={clearSelection} />
      )}

      {/* Drawers */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in">
          <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative z-10 w-[32rem] h-[92vh] anim-scale-in">
            <NewTaskForm editingTaskId={editingTaskId} onDone={closeDrawer} defaultRecurrence={recurringMode} />
          </div>
        </div>
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showCabinet && <CabinetDrawer onEdit={openEditDrawer} onClose={() => setShowCabinet(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
      {showSupabase && <SupabasePanel onClose={() => setShowSupabase(false)} />}
    </div>
  );
}

export default App;
