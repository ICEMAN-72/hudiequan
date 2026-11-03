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
import ReviewModal from './components/ReviewModal';
import Decorations from './components/Decorations';
import DataRecoveryBanner from './components/DataRecoveryBanner';
import QuickNotes from './components/QuickNotes';
import Modal from './components/ui/Modal';
import { useNoteStore, countActiveNotes } from './store/noteStore';
import { useDailyReview } from './hooks/useDailyReview';
import { autoBackupOnLaunch } from './lib/autoBackup';
import type { RecurrenceType } from './types';
import { isRecurringTask } from './types';

function App() {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSupabase, setShowSupabase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recurringMode, setRecurringMode] = useState<RecurrenceType | undefined>(undefined);

  const fontSize = useSettingsStore((s) => s.fontSize);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const autoBackupEnabled = useSettingsStore((s) => s.autoBackupEnabled);
  const tasks = useTaskStore((s) => s.tasks);
  const batchComplete = useTaskStore((s) => s.batchComplete);
  const batchDelete = useTaskStore((s) => s.batchDelete);
  const notes = useNoteStore((s) => s.notes);

  const review = useDailyReview();

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-base', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // 启动时静默备份一次：等应用渲染稳定再写，失败也不打扰
  useEffect(() => {
    if (!autoBackupEnabled) return;
    const timer = window.setTimeout(() => {
      const snapshot = useTaskStore.getState().tasks;
      if (snapshot.length === 0) return;
      autoBackupOnLaunch({ tasks: snapshot }).catch(() => {
        /* 静默失败，状态在设置面板里看 */
      });
    }, 2500);
    return () => window.clearTimeout(timer);
    // 只在启动时跑一次，不等 tasks 变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootTasks = tasks.filter((t) => !t.parentId && !t.isTrashed && !isRecurringTask(t));
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        onCalendarClick={() => setShowCalendar(true)}
        onNotesClick={() => setShowNotes(true)}
        noteCount={countActiveNotes(notes)}
      />

      {/* 对半分：左右各占一半。左列上下等分给任务列表和周期任务，
          右列四象限向下贯通两行 —— 四个象限格子因此变成正方形（460×476）。
          日历不再常驻，走顶栏按钮呼出；灵感走浮窗。 */}
      <div className="flex-1 flex gap-2.5 px-3 pb-3 pt-1 overflow-hidden relative z-10 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          {/* 左列 3:2，不是等比。周期任务通常只有个位数，等比会空掉一半；
              而任务列表是每天盯得最久的地方，多给它 100px 就是多 3 条。 */}
          <section className="tile flex-[1.5] min-h-0">
            <TaskList
              onEdit={openEditDrawer}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </section>

          <section className="tile flex-1 min-h-0">
            <RecurringTasksPanel onEdit={openEditDrawer} onCreateRecurring={openRecurringDrawer} />
          </section>
        </div>

        <section className="tile tile-major flex-1 min-w-0">
          <QuadrantView onEdit={openEditDrawer} />
        </section>
      </div>

      {/* 新建任务 —— 右下角常驻 */}
      <button
        onClick={() => { setEditingTaskId(null); setRecurringMode(undefined); setShowNewTask(true); }}
        className="fixed bottom-5 right-5 z-30 w-13 h-13 rounded-full flex items-center justify-center text-white transition-transform duration-200 hover:scale-105 active:scale-95 anim-pop-in"
        style={{
          width: '3.25rem',
          height: '3.25rem',
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
          boxShadow: '0 6px 22px rgba(124, 58, 237, 0.32), 0 3px 12px rgba(236, 72, 153, 0.18)',
        }}
        title="新建任务"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 新建任务 —— 居中呼出 */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-[3px] anim-backdrop-in" onClick={closeDrawer} />
          <div
            className="relative z-10 w-full"
            style={{ width: 'min(32rem, calc(100vw - 2.5rem))' }}
          >
            <NewTaskForm editingTaskId={editingTaskId} onDone={closeDrawer} defaultRecurrence={recurringMode} />
          </div>
        </div>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showCabinet && <CabinetDrawer onEdit={openEditDrawer} onClose={() => setShowCabinet(false)} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
      {showNotes && <QuickNotes onClose={() => setShowNotes(false)} />}
      {showCalendar && (
        <Modal
          onClose={() => setShowCalendar(false)}
          width="54rem"
          title="日历"
          subtitle="按月看分布，点某天看当天要做什么"
          iconBg="linear-gradient(135deg, #EDE9FE 0%, #FCE7F3 100%)"
          icon={
            <svg className="w-[1.15rem] h-[1.15rem] text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
            </svg>
          }
        >
          <div style={{ height: 'min(66vh, 34rem)' }}>
            <Calendar plain />
          </div>
        </Modal>
      )}
      {showSupabase && <SupabasePanel onClose={() => setShowSupabase(false)} />}
      {review.open && <ReviewModal onClose={review.close} />}

      {/* Batch bar */}
      {selectedIds.size > 0 && (
        <BatchBar count={selectedIds.size} onComplete={handleBatchComplete} onDelete={handleBatchDelete} onClear={clearSelection} />
      )}
    </div>
  );
}

export default App;
