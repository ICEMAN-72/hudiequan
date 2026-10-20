import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { getBackupTime } from '../lib/safeStorage';
import {
  supportsFileSystemAccess,
  pickBackupFolder,
  forgetBackupFolder,
  getBackupFolderName,
  backupNow,
  getLastBackupAt,
} from '../lib/autoBackup';
import type { Task } from '../types';
import Modal from './ui/Modal';

interface SettingsPanelProps {
  onClose: () => void;
}

function formatBackupTime(iso: string | null): string {
  if (!iso) return '暂无快照';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatStamp(ts: number | null): string {
  if (!ts) return '还没备份过';
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const showCompleted = useSettingsStore((s) => s.showCompleted);
  const setShowCompleted = useSettingsStore((s) => s.setShowCompleted);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const reviewEnabled = useSettingsStore((s) => s.reviewEnabled);
  const setReviewEnabled = useSettingsStore((s) => s.setReviewEnabled);
  const reviewTime = useSettingsStore((s) => s.reviewTime);
  const setReviewTime = useSettingsStore((s) => s.setReviewTime);
  const autoBackupEnabled = useSettingsStore((s) => s.autoBackupEnabled);
  const setAutoBackupEnabled = useSettingsStore((s) => s.setAutoBackupEnabled);

  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const canAutoBackup = supportsFileSystemAccess();

  const refreshFolder = () => {
    getBackupFolderName().then(setFolderName).catch(() => setFolderName(null));
    setLastBackupAt(getLastBackupAt());
  };

  useEffect(refreshFolder, []);

  const flash = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const exportData = () => {
    if (tasks.length === 0) {
      flash('err', '当前没有任务可导出');
      return;
    }
    const data = JSON.stringify({ tasks, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `蝴蝶泉任务备份-${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('ok', `已导出 ${tasks.length} 个任务`);
  };

  const clearData = () => {
    setTasks([]);
    setShowClearConfirm(false);
    flash('ok', '已清除全部任务');
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
          const list = Array.isArray(data) ? data : data?.tasks;
          if (!Array.isArray(list)) {
            flash('err', '文件格式不对：需要包含 tasks 数组');
            return;
          }
          if (list.length === 0) {
            flash('err', '文件里没有任何任务');
            return;
          }
          if (tasks.length > 0 && !window.confirm(`导入将覆盖当前的 ${tasks.length} 个任务，确定继续吗？`)) {
            return;
          }
          setTasks(list as Task[]);
          flash('ok', `已导入 ${list.length} 个任务`);
        } catch {
          flash('err', '文件读取失败，可能不是有效的 JSON 备份');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const chooseFolder = async () => {
    setBusy(true);
    try {
      const name = await pickBackupFolder();
      setFolderName(name);
      setAutoBackupEnabled(true);
      const res = await backupNow({ tasks }, { force: true });
      refreshFolder();
      if (res.ok) flash('ok', `已连接「${name}」，并写下第一份备份`);
      else flash('err', res.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '选择文件夹失败';
      if (!/abort/i.test(msg)) flash('err', msg);
    } finally {
      setBusy(false);
    }
  };

  const runBackupNow = async () => {
    setBusy(true);
    try {
      const res = await backupNow({ tasks }, { force: true });
      refreshFolder();
      flash(res.ok ? 'ok' : 'err', res.ok ? `已写入 ${res.fileName}` : res.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnectFolder = async () => {
    await forgetBackupFolder();
    setFolderName(null);
    setLastBackupAt(null);
    setAutoBackupEnabled(false);
    flash('ok', '已断开备份文件夹');
  };

  return (
    <Modal
      onClose={onClose}
      width="31rem"
      title="设置"
      subtitle="外观、复盘与数据"
      icon={
        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
    >
      <div className="space-y-3.5">
        {/* 外观 */}
        <Card
          title="外观"
          desc="字号与主题"
          iconBg="linear-gradient(135deg, #F3E8FF 0%, #FCE7F3 100%)"
          icon={
            <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L18.732 2.732z" />
            </svg>
          }
        >
          <div className="rounded-[14px] surface-card p-4 mb-2.5">
            <div className="flex items-center justify-between mb-3">
              <span className="fs-xs font-semibold text-violet-700">字体大小</span>
              <span className="fs-xs font-bold text-violet-600 tabular-nums bg-violet-50/70 px-2.5 py-1 rounded-full">{fontSize}px</span>
            </div>
            <input type="range" min="14" max="26" step="1" value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full" />
            <div className="flex items-center justify-between mt-2 fs-2xs text-violet-300">
              <span>小 14</span><span>默认 18</span><span>大 26</span>
            </div>
          </div>

          <ToggleRow
            label="深色模式"
            hint="夜里少点刺眼"
            on={darkMode}
            onToggle={() => setDarkMode(!darkMode)}
          />
          <div className="mt-2.5">
            <ToggleRow
              label="显示已完成"
              hint="关掉后列表里隐藏已完成任务"
              on={showCompleted}
              onToggle={() => setShowCompleted(!showCompleted)}
            />
          </div>
        </Card>

        {/* 每日复盘 */}
        <Card
          title="每日复盘"
          desc="到点提醒你收个尾"
          iconBg="linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)"
          icon={
            <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        >
          <ToggleRow
            label="开启复盘提醒"
            hint="每天定时弹出今日完成情况"
            on={reviewEnabled}
            onToggle={() => setReviewEnabled(!reviewEnabled)}
            extra={
              reviewEnabled ? (
                <input
                  type="time"
                  value={reviewTime}
                  onChange={(e) => setReviewTime(e.target.value)}
                  className="w-[5.2rem] px-2.5 py-1.5 rounded-full fs-xs text-violet-700 bg-violet-50/50 border border-violet-100/70 outline-none focus:border-violet-300"
                />
              ) : null
            }
          />
        </Card>

        {/* 自动备份 */}
        <Card
          title="自动备份"
          desc="每天一份 JSON 落到你自己的文件夹"
          iconBg="linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)"
          icon={
            <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        >
          {!canAutoBackup ? (
            <p className="fs-xs text-violet-400 leading-relaxed">
              当前浏览器不支持文件夹授权（需要用 Chrome 或 Edge）。可以先手动「导出」备份。
            </p>
          ) : folderName ? (
            <div className="space-y-2.5">
              <div className="rounded-[14px] surface-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="fs-xs font-semibold text-violet-700 truncate">📁 {folderName}</p>
                    <p className="fs-2xs text-violet-400 mt-1">上次备份：{formatStamp(lastBackupAt)}</p>
                  </div>
                  <button
                    onClick={runBackupNow}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-full fs-xs font-semibold text-white shrink-0 transition-opacity disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
                  >
                    {busy ? '写入中…' : '立即备份'}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="fs-2xs text-violet-300 leading-relaxed">
                  每次启动自动写一份，保留最近 14 份
                </p>
                <button onClick={disconnectFolder} className="fs-2xs text-violet-400 hover:text-pink-500 shrink-0 transition-colors">
                  断开
                </button>
              </div>
              <ToggleRow
                label="启动时自动备份"
                hint="每天最多写一份"
                on={autoBackupEnabled}
                onToggle={() => setAutoBackupEnabled(!autoBackupEnabled)}
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="fs-xs text-violet-400 leading-relaxed">
                选一个文件夹，之后每次打开蝴蝶泉都会自动往里写一份带日期的 JSON。
                浏览器只会给这个目录的读写权，其它文件碰不到。
              </p>
              <button
                onClick={chooseFolder}
                disabled={busy}
                className="action-chip action-chip--violet w-full fs-xs disabled:opacity-50"
              >
                {busy ? '等待授权…' : '选择备份文件夹'}
              </button>
            </div>
          )}
        </Card>

        {/* 数据管理 */}
        <Card
          title="数据管理"
          desc="导出、导入或清除"
          iconBg="linear-gradient(135deg, #FFF1F2 0%, #FDF2F8 100%)"
          icon={
            <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        >
          <div className="rounded-[14px] surface-card p-4">
            <div className="flex items-center justify-between mb-3 px-0.5 gap-2">
              <span className="fs-2xs text-violet-400">🛟 本地快照：{formatBackupTime(getBackupTime())}</span>
              <span className="fs-2xs text-violet-300 shrink-0">{tasks.length} 个任务</span>
            </div>

            {notice && (
              <div className={`mb-3 px-3 py-2 rounded-[10px] fs-2xs font-medium anim-fade-in ${
                notice.type === 'ok' ? 'bg-teal-50 text-teal-600' : 'bg-pink-50 text-pink-600'
              }`}>
                {notice.type === 'ok' ? '✓ ' : '✕ '}{notice.text}
              </div>
            )}

            {showClearConfirm ? (
              <div className="anim-fade-in">
                <p className="fs-xs text-pink-600 font-medium mb-3">确定清除所有任务？这个操作不可撤销。</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowClearConfirm(false)}
                    className="action-chip action-chip--violet flex-1 fs-xs">
                    取消
                  </button>
                  <button onClick={clearData}
                    className="flex-1 py-2 rounded-full fs-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 transition-colors">
                    确认清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <ActionButton onClick={exportData} tone="violet" label="导出"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />} />
                <ActionButton onClick={importData} tone="teal" label="导入"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />} />
                <ActionButton onClick={() => setShowClearConfirm(true)} tone="pink" label="清除"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />} />
              </div>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
}

function Card({
  title,
  desc,
  icon,
  iconBg,
  children,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] bg-violet-50/35 p-4">
      <div className="flex items-center gap-3 mb-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-warm" style={{ background: iconBg ?? '#fff' }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="fs-sm font-bold text-violet-900 leading-tight">{title}</h4>
          <p className="fs-2xs text-violet-400 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
  extra,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] surface-card px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="fs-xs font-semibold text-violet-700">{label}</span>
        {hint && <p className="fs-2xs text-violet-300 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {extra}
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={on}
          className={`relative w-[2.9rem] h-[1.55rem] rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-violet-500' : 'bg-violet-200'}`}
        >
          <span className={`absolute top-[2px] w-[1.15rem] h-[1.15rem] rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[1.55rem]' : 'left-[2px]'}`} />
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  tone,
  label,
  icon,
}: {
  onClick: () => void;
  tone: 'violet' | 'teal' | 'pink';
  label: string;
  icon: React.ReactNode;
}) {
  const tones = {
    violet: 'action-chip--violet',
    teal: 'action-chip--teal',
    pink: 'action-chip--pink',
  } as const;
  return (
    <button
      onClick={onClick}
      className={`action-chip fs-xs ${tones[tone]}`}
    >
      <svg className="w-[0.95rem] h-[0.95rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {icon}
      </svg>
      {label}
    </button>
  );
}
