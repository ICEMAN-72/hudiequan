import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const setShowCompleted = useSettingsStore((s) => s.setShowCompleted);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const exportData = () => {
    const data = JSON.stringify({ tasks, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `蝴蝶泉任务备份-${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setTasks([]);
    setShowClearConfirm(false);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.tasks && Array.isArray(data.tasks)) {
            setTasks(data.tasks as typeof tasks);
          }
        } catch { /* ignore invalid files */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="relative w-[30rem] max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-[24px] shadow-warm-xl p-7 anim-scale-in dew-highlight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — warm */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-violet-50">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-violet-900">设置</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Appearance card */}
        <div className="bg-violet-50/30 rounded-[20px] p-6 mb-5">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-warm shrink-0">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L18.732 2.732z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-violet-900">外观</h4>
              <p className="text-sm text-violet-400 mt-1">字体大小与显示设置</p>
            </div>
          </div>

          {/* Font size */}
          <div className="bg-white/70 rounded-[16px] p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-violet-700">字体大小</span>
              <span className="text-sm font-bold text-violet-600 tabular-nums bg-violet-50/60 px-3 py-1.5 rounded-full">
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min="14"
              max="26"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between mt-3 text-xs text-violet-300">
              <span>小 14</span>
              <span>默认 18</span>
              <span>大 26</span>
            </div>
          </div>

          {/* Dark mode */}
          <div className="bg-white/70 rounded-[16px] p-5 flex items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-sm font-semibold text-violet-700">深色模式</span>
              <p className="text-xs text-violet-300 mt-1.5">切换到深色主题</p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-[3.2rem] h-[1.7rem] rounded-full transition-colors duration-200 shrink-0 shadow-warm ${darkMode ? 'bg-violet-500' : 'bg-violet-200'}`}
            >
              <span className={`absolute top-[2.5px] w-[1.25rem] h-[1.25rem] rounded-full bg-white shadow-sm transition-all duration-200 ${darkMode ? 'left-[1.7rem]' : 'left-[3px]'}`} />
            </button>
          </div>

          {/* Show completed */}
          <div className="bg-white/70 rounded-[16px] p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-violet-700">显示已完成任务</span>
              <p className="text-xs text-violet-300 mt-1.5">关闭后列表中隐藏已完成任务</p>
            </div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`relative w-[3.2rem] h-[1.7rem] rounded-full transition-colors duration-200 shrink-0 shadow-warm ${
                showCompleted ? 'bg-violet-500' : 'bg-violet-200'
              }`}
            >
              <span
                className={`absolute top-[2.5px] w-[1.25rem] h-[1.25rem] rounded-full bg-white shadow-sm transition-all duration-200 ${
                  showCompleted ? 'left-[1.7rem]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Data management card */}
        <div className="bg-violet-50/30 rounded-[20px] p-6">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-warm shrink-0">
              <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-violet-900">数据管理</h4>
              <p className="text-sm text-violet-400 mt-1">导出或清除本地任务数据</p>
            </div>
          </div>

          <div className="bg-white/70 rounded-[16px] p-5">
            {showClearConfirm ? (
              <div className="anim-fade-in">
                <p className="text-sm text-pink-600 font-medium mb-4">确定要清除所有数据吗？此操作不可恢复。</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-violet-500 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={clearData}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 transition-colors"
                  >
                    确认清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={exportData}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出
                </button>
                <button
                  onClick={importData}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  导入
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-pink-500 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
