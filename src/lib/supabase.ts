import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'hudiequan-supabase';

const DEFAULT_URL = 'https://vxnkrknrdnfyvhbtquoi.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bmtya25yZG5meXZoYnRxdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MTY0MTEsImV4cCI6MjEwMTk5MjQxMX0.PZy4ofWpOYsDUrev9TDbngnK51rHLCpVXJSYrA4_GnA';

function getCredentials(): { url: string; key: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function getSupabaseClient() {
  const creds = getCredentials();
  const url = creds?.url || DEFAULT_URL;
  const key = creds?.key || DEFAULT_KEY;
  return createClient(url, key);
}

export function saveCredentials(url: string, key: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
}

export function getStoredCredentials() {
  return getCredentials();
}

export function clearCredentials() {
  localStorage.removeItem(STORAGE_KEY);
}

// Sync tasks to Supabase
export async function syncToCloud(tasks: any[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await supabase.from('tasks').upsert(
    tasks.map((t) => ({ ...t, user_id: user.id })),
    { onConflict: 'id' }
  );
}

export async function pullFromCloud(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];
  const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id);
  return data || [];
}
