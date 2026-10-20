/**
 * 自动本地备份 —— 基于 File System Access API。
 *
 * 为什么用它而不是再上云：
 * 用户已经被 localStorage 坏掉坑过一次，最可靠的兜底是「磁盘上一份能双击打开的 JSON」。
 * 浏览器授权一次文件夹后，每次启动自动写入当天的快照，并只保留最近 N 份。
 *
 * 权限由浏览器管理，应用只拿得到这一个目录的读写权，碰不到其它文件。
 */

const DB_NAME = 'hudiequan-fs';
const STORE = 'handles';
const HANDLE_KEY = 'backup-dir';

const LAST_RUN_KEY = 'hudiequan-autobackup-last';
const FOLDER_NAME_KEY = 'hudiequan-autobackup-folder';

/** 保留最近多少份备份 */
export const KEEP_COUNT = 14;

export const supportsFileSystemAccess = (): boolean =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/* ---------- IndexedDB：FileSystemHandle 只能存在这里，localStorage 存不了 ---------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/* ---------- 目录授权 ---------- */

type DirHandle = FileSystemDirectoryHandle & {
  values?: () => AsyncIterableIterator<FileSystemHandle>;
};

export async function pickBackupFolder(): Promise<string> {
  if (!supportsFileSystemAccess()) {
    throw new Error('当前浏览器不支持选择文件夹，请用 Chrome 或 Edge');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const picker = (window as any).showDirectoryPicker;
  const handle = (await picker({ id: 'hudiequan-backup', mode: 'readwrite' })) as DirHandle;

  const perm = await verifyPermission(handle);
  if (!perm) throw new Error('没有拿到写入权限');

  await idbSet(HANDLE_KEY, handle);
  localStorage.setItem(FOLDER_NAME_KEY, handle.name);
  return handle.name;
}

export async function getBackupFolderName(): Promise<string | null> {
  if (!supportsFileSystemAccess()) return null;
  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return null;
  return localStorage.getItem(FOLDER_NAME_KEY) ?? handle.name ?? null;
}

export async function forgetBackupFolder(): Promise<void> {
  await idbDel(HANDLE_KEY);
  localStorage.removeItem(FOLDER_NAME_KEY);
  localStorage.removeItem(LAST_RUN_KEY);
}

/** 只在用户手势内调用时才可能弹出授权框 */
async function verifyPermission(handle: DirHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  if ((await h.queryPermission(opts)) === 'granted') return true;
  return (await h.requestPermission(opts)) === 'granted';
}

/* ---------- 写入 ---------- */

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function stamp(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export interface BackupPayload {
  tasks: unknown[];
}

export interface BackupResult {
  ok: boolean;
  message: string;
  fileName?: string;
  count?: number;
}

/**
 * 写一份备份。
 * @param force 手动触发时传 true，可以让用户在授权失效时重新授权
 */
export async function backupNow(
  payload: BackupPayload,
  options: { force?: boolean } = {}
): Promise<BackupResult> {
  if (!supportsFileSystemAccess()) {
    return { ok: false, message: '当前浏览器不支持自动备份，请用 Chrome / Edge' };
  }

  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return { ok: false, message: '还没有选择备份文件夹' };

  // 授权过期后，只有在用户主动点击时才能重新申请
  let allowed = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = handle as any;
    allowed = (await h.queryPermission({ mode: 'readwrite' })) === 'granted';
    if (!allowed && options.force) allowed = (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    allowed = false;
  }
  if (!allowed) return { ok: false, message: '备份目录的写入权限已失效，请重新选择文件夹' };

  const fileName = `蝴蝶泉-${stamp()}.json`;
  const body = JSON.stringify(
    { ...payload, exportedAt: new Date().toISOString(), app: 'hudiequan' },
    null,
    2
  );

  try {
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(body);
    await writable.close();
  } catch (e) {
    return {
      ok: false,
      message: `写入失败：${e instanceof Error ? e.message : '未知错误'}`,
    };
  }

  // 只保留最近 KEEP_COUNT 份，避免目录越堆越乱
  try {
    await pruneOldBackups(handle);
  } catch {
    /* 清理失败不影响备份本身 */
  }

  localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
  return { ok: true, message: '已备份', fileName, count: payload.tasks.length };
}

async function pruneOldBackups(handle: DirHandle): Promise<void> {
  if (typeof handle.values !== 'function') return;

  const names: string[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.startsWith('蝴蝶泉-') && entry.name.endsWith('.json')) {
      names.push(entry.name);
    }
  }
  if (names.length <= KEEP_COUNT) return;

  names.sort(); // 文件名带 yyyyMMdd-HHmm，字典序即时间序
  const stale = names.slice(0, names.length - KEEP_COUNT);
  for (const name of stale) {
    try {
      await handle.removeEntry(name);
    } catch {
      /* ignore */
    }
  }
}

/* ---------- 每日一次 ---------- */

export function getLastBackupAt(): number | null {
  const raw = localStorage.getItem(LAST_RUN_KEY);
  return raw ? Number(raw) : null;
}

export function backedUpToday(): boolean {
  const last = getLastBackupAt();
  if (!last) return false;
  const a = new Date(last);
  const b = new Date();
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 启动时静默尝试一次；失败不打扰用户，只在设置里显示状态 */
export async function autoBackupOnLaunch(payload: BackupPayload): Promise<BackupResult | null> {
  if (!supportsFileSystemAccess()) return null;
  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return null;
  if (backedUpToday()) return null;
  return backupNow(payload);
}
