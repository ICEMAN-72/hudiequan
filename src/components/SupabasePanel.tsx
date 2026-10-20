import { useState, useEffect } from 'react';
import {
  getSupabaseClient,
  getCredentials,
  saveCredentials,
  clearCredentials,
  testConnection,
  getCurrentEmail,
  signIn,
  signUp,
  signOut,
  syncToCloud,
  pullFromCloud,
} from '../lib/supabase';
import { useTaskStore } from '../store/taskStore';
import Modal from './ui/Modal';

interface SupabasePanelProps {
  onClose: () => void;
}

type Msg = { type: 'ok' | 'err' | 'info'; text: string } | null;

export default function SupabasePanel({ onClose }: SupabasePanelProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);

  const [step, setStep] = useState<'loading' | 'setup' | 'auth' | 'ready'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  // 凭据配置表单
  const [cfgUrl, setCfgUrl] = useState('');
  const [cfgKey, setCfgKey] = useState('');

  const say = (type: 'ok' | 'err' | 'info', text: string) => setMsg({ type, text });

  useEffect(() => {
    (async () => {
      const creds = getCredentials();
      if (!creds) { setStep('setup'); return; }
      setCfgUrl(creds.url);
      setCfgKey(creds.key);
      const client = getSupabaseClient();
      if (!client) { setStep('setup'); return; }
      const mail = await getCurrentEmail();
      if (mail) { setUserEmail(mail); setStep('ready'); }
      else setStep('auth');
    })();
  }, []);

  // ---------- 配置凭据 ----------
  const handleSaveCredentials = async () => {
    if (!cfgUrl.trim() || !cfgKey.trim()) { say('err', 'URL 和 Key 都要填'); return; }
    setBusy(true);
    say('info', '正在连接…');
    const creds = { url: cfgUrl.trim(), key: cfgKey.trim() };
    try {
      await testConnection(creds);
      saveCredentials(creds.url, creds.key);
      const mail = await getCurrentEmail();
      if (mail) { setUserEmail(mail); setStep('ready'); say('ok', `已连接，当前账号 ${mail}`); }
      else { setStep('auth'); say('ok', '连接成功，请注册或登录'); }
    } catch (e) {
      say('err', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  // ---------- 登录 ----------
  const handleLogin = async () => {
    if (!email || !password) return;
    setBusy(true);
    say('info', '登录中…');
    try {
      await signIn(email, password);
      setUserEmail(email);
      setStep('ready');
      say('info', '已登录，正在拉取云端数据…');
      const cloud = await pullFromCloud();
      if (cloud.length > 0) {
        setTasks(cloud);
        say('ok', `已从云端同步 ${cloud.length} 个任务`);
      } else if (tasks.length > 0) {
        say('info', `云端还是空的，当前本地有 ${tasks.length} 个任务，点「上传」把它们存到云端`);
      } else {
        say('ok', '已登录，云端和本地都还没有任务');
      }
    } catch (e) {
      say('err', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  // ---------- 注册 ----------
  const handleRegister = async () => {
    if (!email || !password) return;
    if (password.length < 6) { say('err', '密码至少 6 位'); return; }
    setBusy(true);
    say('info', '注册中…');
    try {
      const res = await signUp(email, password);
      if (res === 'need_confirm') {
        say('ok', '注册成功，请去邮箱点确认链接，然后回来登录');
      } else {
        setUserEmail(email);
        setStep('ready');
        say('ok', '注册并登录成功');
      }
    } catch (e) {
      say('err', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  // ---------- 上传 / 拉取 ----------
  const handleUpload = async () => {
    setBusy(true);
    say('info', '上传中…');
    try {
      const n = await syncToCloud(tasks);
      say('ok', `已上传 ${n} 个任务到云端`);
    } catch (e) {
      say('err', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const handlePull = async () => {
    if (tasks.length > 0 && !window.confirm(`拉取会用云端数据覆盖本地 ${tasks.length} 个任务，确定吗？`)) return;
    setBusy(true);
    say('info', '拉取中…');
    try {
      const cloud = await pullFromCloud();
      if (cloud.length === 0) { say('err', '云端暂无数据，先点「上传」吧'); }
      else { setTasks(cloud); say('ok', `已拉取 ${cloud.length} 个任务`); }
    } catch (e) {
      say('err', e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const handleLogout = async () => {
    await signOut();
    setUserEmail(null);
    setStep('auth');
    say('ok', '已登出');
  };

  const handleReset = () => {
    clearCredentials();
    setCfgUrl('');
    setCfgKey('');
    setStep('setup');
    say('ok', '已清除凭据配置');
  };

  const tone = {
    ok: 'bg-teal-50 text-teal-700',
    err: 'bg-pink-50 text-pink-700',
    info: 'bg-violet-50 text-violet-600',
  };

  const inputCls =
    'w-full px-4 py-2.5 rounded-[14px] fs-xs text-violet-800 bg-violet-50/60 border border-violet-100 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 outline-none transition-all placeholder:text-violet-300';

  const stepHint =
    step === 'setup' ? '先接上 Supabase 项目' : step === 'auth' ? '登录后开始同步' : '已连接';

  return (
    <Modal
      onClose={onClose}
      width="28rem"
      title="云端同步"
      subtitle={stepHint}
      iconBg="linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)"
      icon={
        <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      }
    >
      <div className="space-y-3.5">
        {msg && (
          <div className={`px-3.5 py-2.5 rounded-[12px] fs-xs leading-relaxed anim-rise-in ${tone[msg.type]}`}>
            {msg.text}
          </div>
        )}

        {step === 'loading' && <p className="fs-xs text-violet-400 text-center py-8">读取中…</p>}

        {/* ---------- 步骤 1：配置凭据 ---------- */}
        {step === 'setup' && (
          <div className="space-y-3">
            <div className="px-3.5 py-2.5 rounded-[12px] bg-amber-50 fs-2xs text-amber-700 leading-relaxed">
              去 supabase.com 建一个项目，在
              <span className="font-semibold"> Settings → API </span>
              复制 Project URL 和 anon public key 填到下面。
            </div>
            <input value={cfgUrl} onChange={(e) => setCfgUrl(e.target.value)}
              placeholder="https://xxxxx.supabase.co" className={inputCls} />
            <textarea value={cfgKey} onChange={(e) => setCfgKey(e.target.value)}
              placeholder="anon public key（eyJ… 开头的长令牌）" rows={3}
              className={inputCls + ' resize-none font-mono fs-2xs'} />
            <button onClick={handleSaveCredentials} disabled={busy || !cfgUrl || !cfgKey}
              className="w-full py-2.5 rounded-full fs-xs font-bold bg-violet-500 text-white disabled:opacity-30 hover:bg-violet-600 transition-colors">
              连接
            </button>
          </div>
        )}

        {/* ---------- 步骤 2：登录 / 注册 ---------- */}
        {step === 'auth' && (
          <div className="space-y-3">
            <p className="fs-xs text-violet-400 text-center">用邮箱注册或登录，任务会同步到云端</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="邮箱" className={inputCls} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
              placeholder="密码（至少 6 位）" className={inputCls}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} />
            <div className="flex gap-2.5">
              <button onClick={handleLogin} disabled={busy || !email || !password}
                className="flex-1 py-2.5 rounded-full fs-xs font-bold bg-violet-500 text-white disabled:opacity-30 hover:bg-violet-600 transition-colors">
                登录
              </button>
              <button onClick={handleRegister} disabled={busy || !email || !password}
                className="flex-1 py-2.5 rounded-full fs-xs font-bold bg-teal-500 text-white disabled:opacity-30 hover:bg-teal-600 transition-colors">
                注册
              </button>
            </div>
            <button onClick={handleReset} className="w-full py-1.5 fs-2xs text-violet-300 hover:text-violet-500 transition-colors">
              更换 Supabase 项目
            </button>
          </div>
        )}

        {/* ---------- 步骤 3：已登录 ---------- */}
        {step === 'ready' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-teal-50">
              <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
              <span className="fs-xs font-medium text-teal-700 truncate">{userEmail}</span>
            </div>

            <div className="flex items-center justify-between px-1 fs-2xs text-violet-400">
              <span>本地任务</span>
              <span className="font-semibold text-violet-500">{tasks.length} 个</span>
            </div>

            <div className="flex gap-2.5">
              <button onClick={handleUpload} disabled={busy}
                className="flex-1 py-2.5 rounded-full fs-xs font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40 transition-colors">
                ↑ 上传
              </button>
              <button onClick={handlePull} disabled={busy}
                className="flex-1 py-2.5 rounded-full fs-xs font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-40 transition-colors">
                ↓ 拉取
              </button>
            </div>

            <p className="fs-2xs text-violet-300 text-center leading-relaxed px-1">
              上传会把本地完整镜像到云端（含删除）；拉取会用云端覆盖本地。
            </p>

            <div className="flex gap-2.5 pt-0.5">
              <button onClick={handleLogout} className="flex-1 py-2 rounded-full fs-2xs font-medium text-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-colors">
                登出
              </button>
              <button onClick={handleReset} className="flex-1 py-2 rounded-full fs-2xs font-medium text-pink-400 hover:text-pink-600 hover:bg-pink-50/50 transition-colors">
                更换项目
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
