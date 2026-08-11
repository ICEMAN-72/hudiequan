import { useState, useEffect } from 'react';
import { getSupabaseClient, syncToCloud, pullFromCloud } from '../lib/supabase';
import { useTaskStore } from '../store/taskStore';

export default function SupabaseAccount() {
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      if (data.session?.user?.email) setUserEmail(data.session.user.email);
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setStatus('登录中…');
    const client = getSupabaseClient();
    const { error, data } = await client.auth.signInWithPassword({ email, password });
    if (error) { setStatus(`登录失败: ${error.message}`); return; }
    if (data.user?.email) { setUserEmail(data.user.email); setStatus('已登录'); }
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setStatus('注册中…');
    const client = getSupabaseClient();
    const { error, data } = await client.auth.signUp({ email, password });
    if (error) { setStatus(`注册失败: ${error.message}`); return; }
    if (data.user) setStatus('注册成功，请查收验证邮件');
  };

  const handleLogout = async () => {
    const client = getSupabaseClient();
    await client.auth.signOut();
    setUserEmail(null);
    setStatus('已登出');
  };

  const handleSync = async () => {
    setSyncing(true); setStatus('同步中…');
    try { await syncToCloud(tasks); setStatus('上传完成'); }
    catch (e: any) { setStatus(`同步失败: ${e.message}`); }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true); setStatus('拉取中…');
    try {
      const cloudTasks = await pullFromCloud();
      if (cloudTasks.length > 0) setTasks(cloudTasks);
      setStatus(`已拉取 ${cloudTasks.length} 个任务`);
    } catch (e: any) { setStatus(`拉取失败: ${e.message}`); }
    setSyncing(false);
  };

  return (
    <div className="bg-white/70 rounded-[16px] p-5">
      {!userEmail ? (
        <div className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱"
            className="w-full px-3 py-2 rounded-[10px] text-xs text-violet-800 bg-violet-50/40 border border-violet-100 outline-none focus:border-violet-300" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="密码"
            className="w-full px-3 py-2 rounded-[10px] text-xs text-violet-800 bg-violet-50/40 border border-violet-100 outline-none focus:border-violet-300" />
          <div className="flex gap-2">
            <button onClick={handleLogin} disabled={!email || !password}
              className="flex-1 py-2 rounded-full text-xs font-bold bg-violet-500 text-white disabled:opacity-30">登录</button>
            <button onClick={handleRegister} disabled={!email || !password}
              className="flex-1 py-2 rounded-full text-xs font-bold bg-teal-500 text-white disabled:opacity-30">注册</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-teal-50 text-teal-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-teal-400" />{userEmail}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing}
              className="flex-1 py-2 rounded-full text-xs font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-30">上传</button>
            <button onClick={handlePull} disabled={syncing}
              className="flex-1 py-2 rounded-full text-xs font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-30">拉取</button>
          </div>
          <button onClick={handleLogout} className="w-full py-1.5 rounded-full text-xs text-pink-500 hover:text-pink-700">登出</button>
        </div>
      )}
      {status && <p className="text-xs text-violet-400 mt-3 text-center">{status}</p>}
    </div>
  );
}
