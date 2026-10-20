import type { Task } from '../types';

const BACKUP_SUFFIX = '-backup';
const BACKUP_TIME_KEY = 'hudiequan-backup-at';

export interface CorruptionInfo {
  detected: boolean;
  key: string | null;
  reason: string;
  raw: string | null;
  backupAvailable: boolean;
  backupTaskCount: number;
  backupAt: string | null;
}

const state: CorruptionInfo = {
  detected: false,
  key: null,
  reason: '',
  raw: null,
  backupAvailable: false,
  backupTaskCount: 0,
  backupAt: null,
};

export function getCorruptionInfo(): CorruptionInfo {
  return state;
}

export function clearCorruption() {
  state.detected = false;
  state.key = null;
  state.reason = '';
  state.raw = null;
  state.backupAvailable = false;
  state.backupTaskCount = 0;
}

export function getBackupSnapshot(): string | null {
  try {
    return localStorage.getItem('hudiequan-tasks' + BACKUP_SUFFIX);
  } catch {
    return null;
  }
}

export function getBackupTime(): string | null {
  try {
    return localStorage.getItem(BACKUP_TIME_KEY);
  } catch {
    return null;
  }
}

/** 校验一段持久化字符串是否是「可用」的 zustand 快照 */
function inspect(raw: string): { ok: boolean; tasks?: Task[]; reason?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'JSON 解析失败' };
  }
  const p = parsed as { state?: { tasks?: unknown } };
  if (!p || typeof p !== 'object' || !p.state || !Array.isArray(p.state.tasks)) {
    return { ok: false, reason: '数据结构异常' };
  }
  return { ok: true, tasks: p.state.tasks as Task[] };
}

function recordCorruption(key: string, raw: string, reason: string) {
  state.detected = true;
  state.key = key;
  state.reason = reason;
  state.raw = raw;
}

/**
 * 带自我保护的 localStorage 适配器：
 * - 读：主数据损坏时自动回退到上一份正常快照，并记录损坏信息
 * - 写：写入前先把当前的「正常」版本轮转为备份；损坏数据永不覆盖好备份
 */
export const safeTaskStorage = {
  getItem: (name: string): string | null => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(name);
    } catch {
      return null;
    }

    if (raw) {
      const result = inspect(raw);
      if (result.ok) return raw;
      recordCorruption(name, raw, result.reason || '未知错误');
    }

    // 主数据为空或损坏 → 尝试备份
    const backup = getBackupSnapshot();
    if (backup) {
      const bres = inspect(backup);
      if (bres.ok) {
        state.backupAvailable = true;
        state.backupTaskCount = bres.tasks!.length;
        state.backupAt = getBackupTime();
        // 自愈：用备份内容回写主键，避免每次刷新都重复报警
        if (state.detected) {
          try {
            // 先把损坏内容另存一份留档，再回写
            if (state.raw) {
              localStorage.setItem('hudiequan-corrupt-snapshot', JSON.stringify({
                at: new Date().toISOString(),
                reason: state.reason,
                raw: state.raw,
              }));
            }
            localStorage.setItem(name, backup);
          } catch {
            /* ignore */
          }
        }
        return backup;
      }
    }

    return null;
  },

  setItem: (name: string, value: string): void => {
    try {
      // 轮转备份：只有当前主数据是「健康」的才覆盖备份
      const prev = localStorage.getItem(name);
      if (prev && inspect(prev).ok) {
        localStorage.setItem(name + BACKUP_SUFFIX, prev);
        localStorage.setItem(BACKUP_TIME_KEY, new Date().toISOString());
      }
      localStorage.setItem(name, value);
      // 成功写入后清除损坏标记
      if (state.detected) clearCorruption();
    } catch (err) {
      console.error('[蝴蝶泉] 本地存储写入失败', err);
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
