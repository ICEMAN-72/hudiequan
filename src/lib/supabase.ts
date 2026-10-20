import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

const STORAGE_KEY = 'hudiequan-supabase';

export interface Credentials {
  url: string;
  key: string;
}

/** 数据库行（PostgREST 返回的 snake_case 结构） */
export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  urgency: string;
  importance: string;
  status: string;
  parent_id: string | null;
  date_type: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  recurrence: string | null;
  template_id: string | null;
  finished_at: number | null;
  is_trashed: boolean;
  created_at: number | null;
  updated_at: string;
}

// ---------- 凭据 ----------

export function getCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.url && parsed?.key) return { url: parsed.url, key: parsed.key };
    }
  } catch {
    /* ignore malformed */
  }
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
  }
  return null;
}

export function hasCredentials(): boolean {
  return getCredentials() !== null;
}

export function saveCredentials(url: string, key: string) {
  const norm = url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: norm, key: key.trim() }));
  cached = null;
}

export function clearCredentials() {
  localStorage.removeItem(STORAGE_KEY);
  cached = null;
}

// ---------- 客户端（缓存，避免每次调用都新建导致会话不一致）----------

let cached: { url: string; client: SupabaseClient } | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getCredentials();
  if (!creds) return null;
  if (cached && cached.url === creds.url) return cached.client;
  const client = createClient(creds.url, creds.key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  cached = { url: creds.url, client };
  return client;
}

/** 连通性自检：连不上或 key 无效时抛出可读错误 */
export async function testConnection(creds: Credentials): Promise<void> {
  const url = creds.url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: creds.key.trim() },
      signal: AbortSignal.timeout(12000),
    });
  } catch (e) {
    throw new Error(
      `无法连接到 ${url}。请确认 Project URL 是否正确，以及项目是否处于暂停状态。` +
        (e instanceof Error ? ` (${e.message})` : '')
    );
  }
  // 400/404 说明服务在跑但路径没内容；401/403 说明 key 不对
  if (res.status === 401 || res.status === 403) {
    throw new Error('anon key 无效或已过期，请到 Supabase → Settings → API 重新复制');
  }
  if (res.status >= 500) {
    throw new Error(`Supabase 返回 ${res.status}，项目可能处于暂停状态，请到 dashboard 恢复`);
  }
}

// ---------- 字段映射 ----------

export function toRow(t: Task, userId: string): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    urgency: t.urgency,
    importance: t.importance,
    status: t.status,
    parent_id: t.parentId ?? null,
    date_type: t.dateType ?? 'none',
    start_date: t.startDate ?? null,
    end_date: t.endDate ?? null,
    notes: t.notes ?? null,
    recurrence: t.recurrence ?? null,
    template_id: t.templateId ?? null,
    finished_at: t.finishedAt ?? null,
    is_trashed: t.isTrashed === true,
    created_at: t.createdAt ?? Date.now(),
    updated_at: new Date().toISOString(),
  };
}

export function fromRow(r: Partial<TaskRow>): Task {
  const task: Task = {
    id: String(r.id),
    title: String(r.title ?? ''),
    urgency: (r.urgency as Task['urgency']) ?? 'low',
    importance: (r.importance as Task['importance']) ?? 'low',
    status: (r.status as Task['status']) ?? 'todo',
    dateType: (r.date_type as Task['dateType']) ?? 'none',
    isTrashed: r.is_trashed === true,
    createdAt: Number(r.created_at) || Date.now(),
  };
  if (r.parent_id) task.parentId = String(r.parent_id);
  if (r.start_date) task.startDate = String(r.start_date);
  if (r.end_date) task.endDate = String(r.end_date);
  if (r.notes) task.notes = String(r.notes);
  if (r.recurrence && r.recurrence !== 'none') task.recurrence = r.recurrence as Task['recurrence'];
  if (r.template_id) task.templateId = String(r.template_id);
  if (r.finished_at != null) task.finishedAt = Number(r.finished_at);
  return task;
}

// ---------- 同步 ----------

async function requireUser() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('尚未配置 Supabase 凭据');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`获取用户失败：${error.message}`);
  if (!data.user) throw new Error('尚未登录');
  return { supabase, user: data.user };
}

/**
 * 上传：把本地任务完整镜像到云端。
 * 先 upsert 全量，再删掉云端多余的行，保证两边一致。
 */
export async function syncToCloud(tasks: Task[]): Promise<number> {
  const { supabase, user } = await requireUser();
  const rows = tasks.map((t) => toRow(t, user.id));

  if (rows.length > 0) {
    const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`上传失败：${error.message}`);
  }

  // 清理云端已被本地删除的任务
  let del = supabase.from('tasks').delete().eq('user_id', user.id);
  if (rows.length > 0) {
    const list = `(${rows.map((r) => `"${r.id}"`).join(',')})`;
    del = del.not('id', 'in', list);
  }
  const { error: delError } = await del;
  if (delError) throw new Error(`清理云端旧数据失败：${delError.message}`);

  return rows.length;
}

/** 拉取：从云端读取全部任务并转成前端结构 */
export async function pullFromCloud(): Promise<Task[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`拉取失败：${error.message}`);
  return (data ?? []).map((r) => fromRow(r as Partial<TaskRow>));
}

// ---------- 账户 ----------

export async function getCurrentEmail(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('尚未配置 Supabase 凭据');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(email: string, password: string): Promise<'need_confirm' | 'done'> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('尚未配置 Supabase 凭据');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data.session ? 'done' : 'need_confirm';
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
