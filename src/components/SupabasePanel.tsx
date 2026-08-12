import { useState, useEffect } from 'react';
import { getSupabaseClient, syncToCloud, pullFromCloud } from '../lib/supabase';
import { useTaskStore } from '../store/taskStore';

interface SupabasePanelProps {
  onClose: () => void;
}

export default function SupabasePanel({ onClose }: SupabasePanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await getSupabaseClient().auth.getSession();
      if (data.session?.user?.email) setUserEmail(data.session.user.email);
    };
    check();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setStatus('登录中…');
    const { error, data } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) { setStatus(`登录失败: ${error.message}`); return; }
    if (data.user?.email) {
      setUserEmail(data.user.email);
      setStatus('已登录，正在拉取数据…');
      try {
        const cloud = await pullFromCloud();
        if (cloud.length > 0) { setTasks(cloud); setStatus(`已同步 ${cloud.length} 个任务`); }
        else setStatus('已登录，云端暂无数据');
      } catch { setStatus('已登录'); }
    }
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setStatus('注册中…');
    const { error, data } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) { setStatus(`注册失败: ${error.message}`); return; }
    setStatus(data?.user ? '注册成功，请查收验证邮件' : '注册成功');
  };

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut();
    setUserEmail(null);
    setStatus('已登出');
  };

  const handleSync = async () => {
    setSyncing(true); setStatus('同步中…');
    try { await syncToCloud(tasks); setStatus('上传完成'); }
    catch (e: any) { setStatus(`失败: ${e.message}`); }
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true); setStatus('拉取中…');
    try {
      const cloud = await pullFromCloud();
      if (cloud.length > 0) { setTasks(cloud); setStatus(`已拉取 ${cloud.length} 个任务`); }
      else setStatus('云端暂无数据');
    } catch (e: any) { setStatus(`失败: ${e.message}`); }
    setSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-violet-900/15 backdrop-blur-sm" />
      <div className="relative z-10 w-[26rem] bg-white/95 backdrop-blur-sm rounded-[24px] shadow-warm-xl p-7 anim-scale-in dew-highlight" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-50">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-violet-900">云端同步</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-violet-300 hover:text-violet-500 hover:bg-violet-50/60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Status */}
        {status && (
          <div className="mb-5 px-4 py-3 rounded-[14px] bg-violet-50/40 text-sm text-violet-600 text-center">{status}</div>
        )}

        {/* Content */}
        {!userEmail ? (
          <div className="space-y-4">
            <p className="text-sm text-violet-400 text-center">使用邮箱注册或登录，数据自动同步到云端</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱"
              className="w-full px-4 py-3 rounded-[14px] text-sm text-violet-800 bg-violet-50/30 border-2 border-transparent focus:border-violet-200 focus:bg-white outline-none transition-colors placeholder:text-violet-200" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="密码"
              className="w-full px-4 py-3 rounded-[14px] text-sm text-violet-800 bg-violet-50/30 border-2 border-transparent focus:border-violet-200 focus:bg-white outline-none transition-colors placeholder:text-violet-200" />
            <div className="flex gap-3">
              <button onClick={handleLogin} disabled={!email || !password}
                className="flex-1 py-3 rounded-full text-sm font-bold bg-violet-500 text-white disabled:opacity-30 hover:bg-violet-600 transition-colors">登录</button>
              <button onClick={handleRegister} disabled={!email || !password}
                className="flex-1 py-3 rounded-full text-sm font-bold bg-teal-500 text-white disabled:opacity-30 hover:bg-teal-600 transition-colors">注册</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-teal-50">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span className="text-sm font-medium text-teal-700">{userEmail}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSync} disabled={syncing}
                className="flex-1 py-3 rounded-full text-sm font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-30 transition-colors">
                ☁ 上传
              </button>
              <button onClick={handlePull} disabled={syncing}
                className="flex-1 py-3 rounded-full text-sm font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-30 transition-colors">
                ☁ 拉取
              </button>
            </div>
            <button onClick={handleLogout}
              className="w-full py-2.5 rounded-full text-sm font-medium text-pink-500 hover:text-pink-700 hover:bg-pink-50/40 transition-colors">
              登出
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
