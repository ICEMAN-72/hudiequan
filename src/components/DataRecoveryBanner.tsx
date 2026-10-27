import { useState, useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';
import {
  getCorruptionInfo,
  clearCorruption,
  getBackupSnapshot,
  getSnapshotInfo,
  readSnapshotRaw,
  type CorruptionInfo,
} from '../lib/safeStorage';
import type { Task } from '../types';

/** 用户主动忽略「列表是空的」提示后记下来，别每次刷新都烦他 */
const EMPTY_SKIP_KEY = 'hudiequan-empty-banner-skipped';

function formatTime(iso: string | null): string {
  if (!iso) return '未知时间';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fromRaw(raw: string): Task[] | null {
  try {
    const parsed = JSON.parse(raw);
    const list = parsed?.state?.tasks;
    return Array.isArray(list) ? (list as Task[]) : null;
  } catch {
    return null;
  }
}

export default function DataRecoveryBanner() {
  /** corrupt = 数据坏了；empty = 数据合法但空了（可能是误写，也可能用户自己清的） */
  const [mode, setMode] = useState<'corrupt' | 'empty' | null>(null);
  const [info, setInfo] = useState<CorruptionInfo | null>(null);
  const [snap, setSnap] = useState<{ count: number; at: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState('');
  const setTasks = useTaskStore((s) => s.setTasks);

  useEffect(() => {
    const c = getCorruptionInfo();
    if (c.detected) {
      setInfo({ ...c });
      setMode('corrupt');
      return;
    }
    // 没有损坏，但列表是空的 —— 只有「曾经有内容」时才有快照，所以新用户不会被打扰
    if (useTaskStore.getState().tasks.length === 0) {
      try {
        if (localStorage.getItem(EMPTY_SKIP_KEY) === '1') return;
      } catch {
        /* ignore */
      }
      const s = getSnapshotInfo();
      if (s) {
        setSnap(s);
        setMode('empty');
      }
    }
  }, []);

  if (!mode || dismissed) return null;

  const restoredAlready = mode === 'corrupt' && !!info?.backupAvailable;

  const finish = (text: string) => {
    setMessage(text);
    clearCorruption();
    try {
      localStorage.removeItem(EMPTY_SKIP_KEY);
    } catch {
      /* ignore */
    }
    setTimeout(() => setDismissed(true), 1400);
  };

  const restoreSnapshot = () => {
    const raw = readSnapshotRaw();
    const list = raw ? fromRaw(raw) : null;
    if (!list?.length) {
      setMessage('快照已不可用，请改用导入备份文件');
      return;
    }
    setTasks(list);
    finish(`已恢复 ${list.length} 个任务`);
  };

  const useBackup = () => {
    const raw = getBackupSnapshot();
    const list = raw ? fromRaw(raw) : null;
    if (!list) {
      setMessage('本地备份不可用');
      return;
    }
    setTasks(list);
    finish(`已从本地备份恢复 ${list.length} 个任务`);
  };

  const importFile = () => {
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
            setMessage('文件格式不对：需要包含 tasks 数组');
            return;
          }
          setTasks(list as Task[]);
          finish(`已导入 ${list.length} 个任务`);
        } catch {
          setMessage('文件读取失败，可能不是有效的 JSON 备份');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const downloadCorrupt = () => {
    if (!info?.raw) return;
    const blob = new Blob([info.raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `蝴蝶泉-损坏数据-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dismiss = () => {
    if (mode === 'empty') {
      // 记住这次选择：主动清空的人不需要每次都被问一遍
      try {
        localStorage.setItem(EMPTY_SKIP_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
    clearCorruption();
  };

  const tone = restoredAlready
    ? { bar: 'bg-amber-50/95 border-amber-200', text: 'text-amber-800', sub: 'text-amber-600', btn: 'bg-amber-500 hover:bg-amber-600' }
    : mode === 'empty'
      ? { bar: 'bg-violet-50/95 border-violet-200', text: 'text-violet-800', sub: 'text-violet-500', btn: 'bg-violet-500 hover:bg-violet-600' }
      : { bar: 'bg-pink-50/95 border-pink-200', text: 'text-pink-800', sub: 'text-pink-600', btn: 'bg-pink-500 hover:bg-pink-600' };

  return (
    <div className={`fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[42rem] max-w-[92vw] border rounded-[18px] px-5 py-4 shadow-warm-xl backdrop-blur-sm anim-slide-up ${tone.bar}`}>
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-white/70 flex items-center justify-center shrink-0 mt-0.5">
          <svg className={`w-[1.15rem] h-[1.15rem] ${tone.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mode === 'empty' ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            )}
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${tone.text}`}>
            {mode === 'empty'
              ? '任务列表是空的，但本地还有一份快照'
              : restoredAlready
                ? '本地存储损坏，已自动回滚到备份'
                : '本地存储损坏，数据读取失败'}
          </h4>
          <p className={`text-xs mt-1.5 leading-relaxed ${tone.sub}`}>
            {mode === 'empty' && snap
              ? `${formatTime(new Date(snap.at).toISOString())} 保存的快照里有 ${snap.count} 个任务。如果你是主动清空的，直接忽略即可（之后不再提示）。`
              : restoredAlready
                ? `检测到 ${info?.reason}。已自动加载 ${formatTime(info?.backupAt ?? null)} 的快照（${info?.backupTaskCount} 个任务），请确认内容是否完整，然后导出一次备份。`
                : `检测到 ${info?.reason}，且没有可用的本地备份。请点「导入备份」选择之前导出的 JSON 文件恢复。`}
          </p>

          {message && <p className={`text-xs mt-2 font-semibold ${tone.text}`}>{message}</p>}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {mode === 'empty' ? (
              <button onClick={restoreSnapshot} className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-colors ${tone.btn}`}>
                恢复这 {snap?.count} 个任务
              </button>
            ) : (
              !restoredAlready && (
                <button onClick={useBackup} className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-colors ${tone.btn}`}>
                  用本地备份恢复
                </button>
              )
            )}
            <button onClick={importFile} className={`px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-colors ${tone.btn}`}>
              导入备份文件
            </button>
            {mode === 'corrupt' && (
              <button onClick={downloadCorrupt}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/70 text-violet-600 hover:bg-white transition-colors">
                下载损坏数据留档
              </button>
            )}
            <button onClick={dismiss}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-400 hover:text-violet-600 transition-colors">
              {mode === 'empty' ? '不用，我确实清空了' : '忽略'}
            </button>
          </div>
        </div>

        <button onClick={dismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
