import type { Task } from '../types';

const BACKUP_SUFFIX = '-backup';
const BACKUP_TIME_KEY = 'hudiequan-backup-at';

/**
 * 多版本快照。
 *
 * 只有一份 `-backup` 是不够的：它每次写入都被覆写，所以「连续几次写入都是
 * 格式合法但内容已经错了」时（比如某次迁移把任务搞成空数组），单份备份会
 * 跟着一起变成错的那份，回头找不到更早的好数据。
 * 这里保留最近若干份，只追加不覆盖，并且带任务数，回退时可以跳过空快照。
 */
const SNAP_KEY = 'hudiequan-tasks-snapshots';
const SNAP_MAX = 3;
/** 快照最短间隔：避免每敲一个字都存一份 */
const SNAP_MIN_GAP = 5 * 60 * 1000;

interface Snapshot {
  at: number;
  count: number;
  raw: string;
}

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

/* ---------- 多版本快照 ---------- */

function readSnapshots(): Snapshot[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as Snapshot[]) : [];
  } catch {
    return [];
  }
}

/**
 * 存一份快照。
 * @param force 传 true 时忽略节流 —— 用于「即将被空数据/异常数据覆盖」的抢救
 */
function pushSnapshot(raw: string, force = false): void {
  const result = inspect(raw);
  if (!result.ok) return;
  const count = result.tasks!.length;
  // 空数据没有保存价值，存了反而会挤掉真正有用的旧快照
  if (count === 0) return;

  try {
    const list = readSnapshots();
    const last = list[list.length - 1];
    if (!force && last && Date.now() - last.at < SNAP_MIN_GAP) return;
    // 内容没变就不重复占地方
    if (last && last.raw === raw) return;

    list.push({ at: Date.now(), count, raw });
    while (list.length > SNAP_MAX) list.shift();
    localStorage.setItem(SNAP_KEY, JSON.stringify(list));
  } catch {
    /* 容量超限时静默放弃，不能因为存快照而影响主写入 */
  }
}

/** 从新到旧找第一份「格式合法且非空」的快照 */
function latestUsableSnapshot(): { raw: string; count: number; at: number } | null {
  const list = readSnapshots();
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    const res = inspect(s.raw);
    if (res.ok && res.tasks!.length > 0) {
      return { raw: s.raw, count: res.tasks!.length, at: s.at };
    }
  }
  return null;
}

export function getSnapshotInfo(): { count: number; at: number } | null {
  const s = latestUsableSnapshot();
  return s ? { count: s.count, at: s.at } : null;
}

/** 取最新一份可用快照的原始字符串，供恢复提示使用 */
export function readSnapshotRaw(): string | null {
  return latestUsableSnapshot()?.raw ?? null;
}

/** 用可用的快照回写主键，顺便把损坏内容留档备查 */
function restore(name: string, good: string): string {
  try {
    if (state.detected && state.raw) {
      localStorage.setItem(
        'hudiequan-corrupt-snapshot',
        JSON.stringify({ at: new Date().toISOString(), reason: state.reason, raw: state.raw })
      );
    }
    localStorage.setItem(name, good);
  } catch {
    /* 回写失败也不影响本次返回值 */
  }
  return good;
}

/**
 * 带自我保护的 localStorage 适配器：
 * - 读：主数据损坏时按「多版本快照 → 单份备份」的顺序回退，并记录损坏信息
 * - 写：写入前把当前健康版本轮转为备份；「有内容 → 变空」时强制抢救快照
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
      // 注意：合法但为空**不**做自动恢复。
      // 用户主动「清除全部任务」写进去的就是空数组，如果这里按"空就是坏了"处理，
      // 清完下次一刷新任务又全部回来，反而更吓人。
      // 空数据的抢救交给 DataRecoveryBanner 提示 + 用户自己点确认。
      if (result.ok) return raw;
      recordCorruption(name, raw, result.reason || '未知错误');
    }

    // 主数据损坏 → 先试多版本快照（更新），再试单份备份
    const snap = latestUsableSnapshot();
    if (snap) {
      state.backupAvailable = true;
      state.backupTaskCount = snap.count;
      state.backupAt = new Date(snap.at).toISOString();
      return restore(name, snap.raw);
    }

    const backup = getBackupSnapshot();
    if (backup) {
      const bres = inspect(backup);
      if (bres.ok) {
        state.backupAvailable = true;
        state.backupTaskCount = bres.tasks!.length;
        state.backupAt = getBackupTime();
        return restore(name, backup);
      }
    }

    return null;
  },

  setItem: (name: string, value: string): void => {
    try {
      const prev = localStorage.getItem(name);
      const prevRes = prev ? inspect(prev) : null;
      const prevCount = prevRes?.ok ? prevRes.tasks!.length : 0;
      const nextRes = inspect(value);
      const nextCount = nextRes.ok ? nextRes.tasks!.length : 0;

      // 「本来有内容，一下子变成空」——先强制抢救一份，再让写入继续。
      // 这是最容易被忽略的丢数据方式：格式完全合法，就是内容没了。
      if (prev && prevCount > 0 && nextCount === 0) {
        pushSnapshot(prev, true);
      }

      // 轮转备份：只有当前主数据是「健康」的才覆盖备份
      if (prev && prevRes?.ok) {
        localStorage.setItem(name + BACKUP_SUFFIX, prev);
        localStorage.setItem(BACKUP_TIME_KEY, new Date().toISOString());
      }

      localStorage.setItem(name, value);

      // 写入成功，顺手留一份带时间戳的快照（有节流）
      if (nextRes.ok) pushSnapshot(value);

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
