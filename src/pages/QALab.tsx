import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api, Vibe, User } from '../lib/api';
import { supabase, signUpWithEmail, signInWithEmail, signOut } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: number;
  ts: string;
  level: 'info' | 'ok' | 'err' | 'warn';
  msg: string;
}

interface GeneratedAccount {
  email: string;
  password: string;
  username: string;
  status: 'pending' | 'created' | 'error';
  note?: string;
}

type Tab = 'data' | 'interact' | 'cleanup' | 'system';

// ─── Sample vibe templates ────────────────────────────────────────────────────
const VIBE_TEMPLATES = [
  {
    title: 'Gradient Wave',
    tags: 'Canvas Art',
    code: `<!DOCTYPE html><html><body style="margin:0;background:#0f0f1a"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=innerWidth;c.height=innerHeight;
let t=0;
function draw(){
  ctx.fillStyle='rgba(15,15,26,0.05)';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<5;i++){
    ctx.beginPath();
    for(let x=0;x<c.width;x+=4){
      const y=c.height/2+Math.sin(x*0.01+t+i)*60+Math.sin(x*0.02-t*0.7+i)*30;
      x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.strokeStyle=\`hsl(\${t*20+i*60},80%,60%)\`;ctx.lineWidth=2;ctx.stroke();
  }
  t+=0.02;requestAnimationFrame(draw);
}draw();
<\/script></body></html>`,
  },
  {
    title: 'Click Counter',
    tags: 'SaaS UI',
    code: `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#111;font-family:sans-serif">
<div style="text-align:center">
  <div id="n" style="font-size:6rem;font-weight:900;color:#7c3aed;line-height:1">0</div>
  <button onclick="document.getElementById('n').textContent=+document.getElementById('n').textContent+1"
    style="margin-top:2rem;padding:1rem 3rem;font-size:1.2rem;background:#7c3aed;color:#fff;border:none;border-radius:999px;cursor:pointer">
    Click me
  </button>
</div></body></html>`,
  },
  {
    title: 'Live Clock',
    tags: 'Micro-interactions',
    code: `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;font-family:monospace">
<div id="clock" style="font-size:5rem;color:#22d3ee;letter-spacing:0.1em;text-shadow:0 0 40px #22d3ee88"></div>
<script>
setInterval(()=>{
  const d=new Date();
  document.getElementById('clock').textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');
},1000);
<\/script></body></html>`,
  },
  {
    title: 'Particle Rain',
    tags: '3D Effects',
    code: `<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c"></canvas><script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=innerWidth;c.height=innerHeight;
const ps=Array.from({length:150},()=>({x:Math.random()*c.width,y:Math.random()*c.height,s:Math.random()*3+1,v:Math.random()*4+2,h:Math.random()*60+180}));
function draw(){
  ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,0,c.width,c.height);
  ps.forEach(p=>{
    ctx.fillStyle=\`hsl(\${p.h},100%,70%)\`;
    ctx.fillRect(p.x,p.y,p.s,p.s*4);
    p.y+=p.v;if(p.y>c.height){p.y=-20;p.x=Math.random()*c.width;}
  });
  requestAnimationFrame(draw);
}draw();
<\/script></body></html>`,
  },
  {
    title: 'Neon Button',
    tags: 'SaaS UI',
    code: `<!DOCTYPE html><html><head><style>
body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0d0d;font-family:sans-serif}
.btn{padding:1.2rem 3rem;font-size:1.1rem;font-weight:600;color:#f0f;border:2px solid #f0f;background:transparent;border-radius:8px;cursor:pointer;letter-spacing:0.1em;text-transform:uppercase;transition:all .3s;box-shadow:0 0 20px #f0f4,inset 0 0 20px #f0f1}
.btn:hover{background:#f0f;color:#000;box-shadow:0 0 40px #f0f,0 0 80px #f0f4}
</style></head><body><button class="btn">Vibe Check</button></body></html>`,
  },
  {
    title: 'Data Viz Bar',
    tags: 'Data Viz',
    code: `<!DOCTYPE html><html><head><style>
body{margin:0;padding:2rem;background:#111;font-family:sans-serif;color:#fff}
.bar-wrap{display:flex;flex-direction:column;gap:.6rem}
.bar{height:2.2rem;background:linear-gradient(90deg,#7c3aed,#06b6d4);border-radius:4px;display:flex;align-items:center;padding:0 1rem;font-size:.9rem;font-weight:600;transition:width 1s ease}
</style></head><body>
<h2 style="margin-bottom:1.5rem">Monthly Vibes</h2>
<div class="bar-wrap" id="bars"></div>
<script>
const data=[['Jan',45],['Feb',72],['Mar',38],['Apr',91],['May',63],['Jun',80]];
const max=Math.max(...data.map(d=>d[1]));
document.getElementById('bars').innerHTML=data.map(([m,v])=>
  \`<div class="bar" style="width:\${(v/max*90).toFixed(0)}%">\${m} · \${v}</div>\`
).join('');
<\/script></body></html>`,
  },
];

const TAGS = ['3D Effects', 'SaaS UI', 'Micro-interactions', 'Tailwind Magic', 'Data Viz', 'Shaders', 'Typography', 'Layouts', 'Canvas Art'];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomId() { return Math.random().toString(36).slice(2, 8); }
function formatRelativeTime(value?: string) {
  if (!value) return '-';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return '-';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '剛剛';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string; accent: string }[] = [
  { id: 'data',     label: '資料建立', icon: 'database',      accent: 'violet' },
  { id: 'interact', label: '互動測試', icon: 'bolt',          accent: 'cyan'   },
  { id: 'cleanup',  label: '清理中心', icon: 'delete_sweep',  accent: 'red'    },
  { id: 'system',   label: '系統健診', icon: 'monitor_heart', accent: 'emerald'},
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function QALab() {
  const [dbUser, setDbUser]           = useState<User | null>(null);
  const [supabaseId, setSupabaseId]   = useState<string | null>(null);
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [vibes, setVibes]             = useState<Vibe[]>([]);
  const [activeTab, setActiveTab]     = useState<Tab>('data');
  const [logFilter, setLogFilter]     = useState<LogEntry['level'] | 'all'>('all');
  const [showLog, setShowLog]         = useState(false); // mobile log toggle
  const logRef  = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  // Account generator state
  const [genAccounts, setGenAccounts] = useState<GeneratedAccount[]>([]);
  const [genLoading, setGenLoading]   = useState(false);

  // Vibe factory state
  const [vibeCount, setVibeCount]           = useState(1);
  const [vibeLoading, setVibeLoading]       = useState(false);
  const [vibeProgress, setVibeProgress]     = useState<{ done: number; total: number } | null>(null);

  // Remix state
  const [remixTarget, setRemixTarget] = useState<number | ''>('');
  const [remixLoading, setRemixLoading] = useState(false);

  // Like state
  const [likeMap, setLikeMap] = useState<Record<number, boolean>>({});

  // Follow state
  const [followUsername, setFollowUsername]   = useState('');
  const [followStatus, setFollowStatus]       = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading]     = useState(false);

  // Comment tester state
  const [commentVibeId, setCommentVibeId]   = useState<number | ''>('');
  const [commentText, setCommentText]       = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Cleanup center state
  const [cleanupQuery, setCleanupQuery]           = useState('');
  const [cleanupAuthor, setCleanupAuthor]         = useState('all');
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<number[]>([]);
  const [cleanupDeleting, setCleanupDeleting]     = useState(false);

  // System health state
  const [pingLoading, setPingLoading]       = useState(false);
  const [pingResult, setPingResult]         = useState<{ ms: number; ok: boolean; msg: string } | null>(null);
  const [dbStats, setDbStats]               = useState<{ vibes: number; authors: number } | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);

  // ── Auth sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) syncUser(data.session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) syncUser(session.user);
      else { setDbUser(null); setSupabaseId(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (u: any) => {
    setSupabaseId(u.id);
    try {
      const user = await api.syncUser({
        supabase_id: u.id,
        username: u.user_metadata?.user_name || u.user_metadata?.name || u.email || 'anonymous',
        avatar: u.user_metadata?.avatar_url || '',
      });
      setDbUser(user);
    } catch (e: any) { addLog('err', `驗證同步失敗：${e.message}`); }
  };

  // ── Load vibes ─────────────────────────────────────────────────────────────
  useEffect(() => { loadVibes(); }, []);

  const loadVibes = async () => {
    try {
      const all = await api.getVibes();
      setVibes(all.slice(0, 120));
    } catch (e: any) { addLog('err', `載入 Vibe 失敗：${e.message}`); }
  };

  const authorOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const vibe of vibes) {
      map.set(vibe.author_name, (map.get(vibe.author_name) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [vibes]);

  const filteredCleanupVibes = useMemo(() => {
    const q = cleanupQuery.trim().toLowerCase();
    return vibes
      .filter(v => cleanupAuthor === 'all' || v.author_name === cleanupAuthor)
      .filter(v =>
        !q
          || v.title.toLowerCase().includes(q)
          || v.author_name.toLowerCase().includes(q)
          || String(v.id).includes(q)
      )
      .sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
  }, [vibes, cleanupAuthor, cleanupQuery]);

  const selectedVisibleCount = useMemo(
    () => filteredCleanupVibes.filter(v => selectedDeleteIds.includes(v.id)).length,
    [filteredCleanupVibes, selectedDeleteIds]
  );

  useEffect(() => {
    setSelectedDeleteIds(prev => prev.filter(id => vibes.some(v => v.id === id)));
  }, [vibes]);

  useEffect(() => {
    if (!dbUser) return;
    if (cleanupAuthor === 'all') return;
    if (cleanupAuthor === dbUser.username) return;
    if (!authorOptions.find(a => a.name === cleanupAuthor)) {
      setCleanupAuthor('all');
    }
  }, [dbUser, cleanupAuthor, authorOptions]);

  // ── Log ────────────────────────────────────────────────────────────────────
  const addLog = useCallback((level: LogEntry['level'], msg: string) => {
    const id = ++logIdRef.current;
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    setLogs(prev => [...prev.slice(-199), { id, ts, level, msg }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const filteredLogs = useMemo(
    () => logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter),
    [logs, logFilter]
  );

  const exportLog = () => {
    const text = logs.map(l => `[${l.ts}] ${l.level.toUpperCase()} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => addLog('ok', '已複製記錄到剪貼簿'));
  };

  // ── Account Generator ──────────────────────────────────────────────────────
  const generateAccount = async () => {
    const uid = randomId();
    const email = `qa_${uid}@vibejam.test`;
    const username = `qa_${uid}`;
    const password = `QATest_${uid}!`;
    const acc: GeneratedAccount = { email, password, username, status: 'pending' };
    setGenAccounts(prev => [acc, ...prev.slice(0, 9)]);
    setGenLoading(true);
    addLog('info', `正在建立帳號：${username}`);
    try {
      await signUpWithEmail(email, password, username);
      setGenAccounts(prev => prev.map(a => a.email === email ? { ...a, status: 'created', note: '若需要驗證，請檢查信箱' } : a));
      addLog('ok', `帳號建立成功：${username} / ${email}`);
    } catch (e: any) {
      setGenAccounts(prev => prev.map(a => a.email === email ? { ...a, status: 'error', note: e.message } : a));
      addLog('err', `帳號建立失敗：${e.message}`);
    } finally { setGenLoading(false); }
  };

  const loginAs = async (acc: GeneratedAccount) => {
    addLog('info', `正在以 ${acc.username} 登入...`);
    try {
      await signInWithEmail(acc.email, acc.password);
      addLog('ok', `已登入：${acc.username}`);
    } catch (e: any) { addLog('err', `登入失敗：${e.message}`); }
  };

  // ── Vibe Factory ───────────────────────────────────────────────────────────
  const createVibes = async () => {
    if (!dbUser) { addLog('err', '建立 Vibe 前請先登入'); return; }
    setVibeLoading(true);
    setVibeProgress({ done: 0, total: vibeCount });
    addLog('info', `正在建立 ${vibeCount} 個 Vibe...`);
    let created = 0;
    for (let i = 0; i < vibeCount; i++) {
      const tpl = randomItem(VIBE_TEMPLATES);
      const suffix = randomId();
      try {
        const res = await api.createVibe({
          title: `${tpl.title} ${suffix}`,
          tags: tpl.tags,
          code: tpl.code,
          description: `QA 測試 Vibe #${i + 1}`,
          author_id: dbUser.id,
          visibility: 'public',
        });
        addLog('ok', `Vibe 建立成功："${tpl.title} ${suffix}" (id:${res.id})`);
        created++;
      } catch (e: any) { addLog('err', `Vibe #${i + 1} 建立失敗：${e.message}`); }
      setVibeProgress({ done: i + 1, total: vibeCount });
    }
    addLog('ok', `完成：已建立 ${created}/${vibeCount} 個 Vibe`);
    setVibeLoading(false);
    setVibeProgress(null);
    loadVibes();
  };

  // ── Remix ──────────────────────────────────────────────────────────────────
  const remixVibe = async () => {
    if (!dbUser) { addLog('err', 'Remix 前請先登入'); return; }
    if (!remixTarget) { addLog('warn', '請選擇要 Remix 的 Vibe'); return; }
    const parent = vibes.find(v => v.id === Number(remixTarget));
    if (!parent) return;
    setRemixLoading(true);
    addLog('info', `正在 Remix "${parent.title}" (id:${parent.id})...`);
    try {
      const res = await api.createVibe({
        title: `Remix of ${parent.title} [${randomId()}]`,
        tags: parent.tags || 'SaaS UI',
        code: parent.latest_code || '<div>Remixed!</div>',
        description: `QA Remix Vibe #${parent.id}`,
        author_id: dbUser.id,
        parent_vibe_id: parent.id,
        parent_version_number: parent.latest_version || 1,
        visibility: 'public',
      });
      addLog('ok', `Remix 建立成功 (id:${res.id})，來源 "${parent.title}"`);
      loadVibes();
    } catch (e: any) { addLog('err', `Remix 失敗：${e.message}`); }
    setRemixLoading(false);
  };

  // ── Like ───────────────────────────────────────────────────────────────────
  const toggleLike = async (vibe: Vibe) => {
    if (!supabaseId) { addLog('err', '按讚前請先登入'); return; }
    try {
      const res = await api.toggleLike(vibe.id, supabaseId);
      setLikeMap(prev => ({ ...prev, [vibe.id]: res.liked }));
      addLog('ok', `${res.liked ? '已按讚' : '已取消讚'} "${vibe.title}"（${res.like_count} 讚）`);
    } catch (e: any) { addLog('err', `按讚失敗：${e.message}`); }
  };

  const likeAllVibes = async () => {
    if (!supabaseId) { addLog('err', '請先登入'); return; }
    addLog('info', `正在對已載入的 ${vibes.length} 個 Vibe 全部按讚...`);
    let done = 0;
    for (const v of vibes) {
      try {
        const res = await api.toggleLike(v.id, supabaseId);
        setLikeMap(prev => ({ ...prev, [v.id]: res.liked }));
        done++;
      } catch {}
    }
    addLog('ok', `已按讚 ${done} 個 Vibe`);
  };

  // ── Follow ─────────────────────────────────────────────────────────────────
  const toggleFollow = async (username: string) => {
    if (!supabaseId) { addLog('err', '追蹤前請先登入'); return; }
    if (!username.trim()) { addLog('warn', '請輸入使用者名稱'); return; }
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(username.trim(), supabaseId);
      setFollowStatus(prev => ({ ...prev, [username]: res.following }));
      addLog('ok', `${res.following ? '已追蹤' : '已取消追蹤'} @${username}（${res.followers_count} 位追蹤者）`);
    } catch (e: any) { addLog('err', `追蹤失敗：${e.message}`); }
    setFollowLoading(false);
  };

  // ── Comment Tester ─────────────────────────────────────────────────────────
  const postComment = async () => {
    if (!dbUser) { addLog('err', '留言前請先登入'); return; }
    if (!commentVibeId) { addLog('warn', '請選擇目標 Vibe'); return; }
    if (!commentText.trim()) { addLog('warn', '留言內容不能為空'); return; }
    const target = vibes.find(v => v.id === Number(commentVibeId));
    if (!target) return;
    setCommentLoading(true);
    addLog('info', `正在對 "${target.title}" 留言...`);
    try {
      await api.addComment(Number(commentVibeId), {
        content: commentText.trim(),
        version_id: target.latest_version || 1,
        author_id: dbUser.id,
      });
      addLog('ok', `留言成功 → "${target.title}"`);
      setCommentText('');
    } catch (e: any) { addLog('err', `留言失敗：${e.message}`); }
    setCommentLoading(false);
  };

  // ── Cleanup center actions ─────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedDeleteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllVisible = () => {
    setSelectedDeleteIds(prev => {
      const set = new Set(prev);
      for (const v of filteredCleanupVibes) set.add(v.id);
      return [...set];
    });
  };

  const clearSelected = () => setSelectedDeleteIds([]);

  const deleteSelectedVibes = async () => {
    if (!supabaseId) { addLog('err', '刪除前請先登入'); return; }
    if (selectedDeleteIds.length === 0) { addLog('warn', '請先選擇要刪除的專案'); return; }
    if (!confirm(`確定要刪除 ${selectedDeleteIds.length} 個已選專案？`)) return;
    setCleanupDeleting(true);
    let ok = 0; let failed = 0;
    addLog('info', `開始刪除 ${selectedDeleteIds.length} 個專案...`);
    for (const id of selectedDeleteIds) {
      try { await api.deleteVibe(id, supabaseId); ok++; }
      catch { failed++; }
    }
    addLog('ok', `刪除完成：成功 ${ok}，失敗 ${failed}`);
    setCleanupDeleting(false);
    setSelectedDeleteIds([]);
    await loadVibes();
  };

  const deleteSingleVibe = async (v: Vibe) => {
    if (!supabaseId) { addLog('err', '刪除前請先登入'); return; }
    if (!confirm(`確定刪除 "${v.title}"（#${v.id}）？`)) return;
    try {
      await api.deleteVibe(v.id, supabaseId);
      addLog('ok', `已刪除 "${v.title}"（#${v.id}）`);
      setSelectedDeleteIds(prev => prev.filter(id => id !== v.id));
      await loadVibes();
    } catch (e: any) {
      addLog('err', `刪除失敗 #${v.id}：${e.message || '無法刪除'}`);
    }
  };

  // ── System Health ──────────────────────────────────────────────────────────
  const pingApi = async () => {
    setPingLoading(true);
    setPingResult(null);
    addLog('info', '正在 Ping API...');
    const start = performance.now();
    try {
      const res = await fetch('/api/vibes');
      const ms = Math.round(performance.now() - start);
      if (res.ok) {
        setPingResult({ ms, ok: true, msg: `HTTP ${res.status} · ${ms}ms` });
        addLog('ok', `API 回應正常：${ms}ms`);
      } else {
        setPingResult({ ms, ok: false, msg: `HTTP ${res.status} · ${ms}ms` });
        addLog('err', `API 回應異常：${res.status}`);
      }
    } catch (e: any) {
      const ms = Math.round(performance.now() - start);
      setPingResult({ ms, ok: false, msg: `連線失敗：${e.message}` });
      addLog('err', `API Ping 失敗：${e.message}`);
    }
    setPingLoading(false);
  };

  const loadDbStats = async () => {
    setDbStatsLoading(true);
    addLog('info', '正在取得資料庫統計...');
    try {
      const all = await api.getVibes();
      const authors = new Set(all.map(v => v.author_name)).size;
      setDbStats({ vibes: all.length, authors });
      addLog('ok', `資料庫統計：${all.length} 個 Vibe，${authors} 位作者`);
    } catch (e: any) {
      addLog('err', `取得統計失敗：${e.message}`);
    }
    setDbStatsLoading(false);
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
  const logColor: Record<LogEntry['level'], string> = {
    info: 'text-sky-400',
    ok:   'text-emerald-400',
    err:  'text-red-400',
    warn: 'text-amber-400',
  };
  const logBg: Record<LogEntry['level'], string> = {
    info: 'bg-sky-500/10',
    ok:   'bg-emerald-500/10',
    err:  'bg-red-500/10',
    warn: 'bg-amber-500/10',
  };
  const logIcon: Record<LogEntry['level'], string> = {
    info: 'info',
    ok:   'check_circle',
    err:  'error',
    warn: 'warning',
  };

  const mineCount = dbUser ? vibes.filter(v => v.author_name === dbUser.username).length : 0;
  const errCount  = logs.filter(l => l.level === 'err').length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#162238_0%,_#090d18_45%,_#060810_100%)] text-white font-mono text-sm flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#070a13]/92 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center justify-between px-4 md:px-5 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
              <div className="absolute w-7 h-7 rounded-full bg-cyan-500/20 animate-ping" />
              <div className="relative w-3.5 h-3.5 rounded-full bg-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm tracking-tight">QA 控制台</span>
                <span className="px-1.5 py-0.5 bg-cyan-500/15 border border-cyan-500/30 rounded text-cyan-300 text-[10px] font-semibold tracking-widest uppercase">Internal</span>
                {errCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/15 border border-red-500/30 rounded text-red-300 text-[10px] font-semibold">
                    {errCount} 錯誤
                  </span>
                )}
              </div>
              <div className="text-white/35 text-[10px] mt-0.5 hidden sm:block">壓測、資料建立、互動驗證、專案清理、系統健診</div>
            </div>
          </div>

          {/* Auth + mobile log toggle */}
          <div className="flex items-center gap-2">
            {/* Mobile log toggle */}
            <button
              onClick={() => setShowLog(v => !v)}
              className="xl:hidden relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs transition-all hover:bg-white/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">terminal</span>
              <span>紀錄</span>
              {logs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] flex items-center justify-center text-white font-bold">
                  {logs.length > 99 ? '99+' : logs.length}
                </span>
              )}
            </button>

            {dbUser ? (
              <div className="flex items-center gap-2">
                {dbUser.avatar && <img src={dbUser.avatar} className="w-7 h-7 rounded-full ring-1 ring-white/10 hidden sm:block" alt={dbUser.username} />}
                <div className="text-right hidden sm:block">
                  <div className="text-white/80 text-xs font-medium">@{dbUser.username}</div>
                  <div className="text-white/25 text-[10px]">{supabaseId?.slice(0, 12)}…</div>
                </div>
                <button
                  onClick={async () => { await signOut(); addLog('info', '已登出'); }}
                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded text-red-400 text-xs transition-all duration-200 cursor-pointer"
                >
                  登出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="material-symbols-outlined text-[13px] text-amber-400">lock</span>
                <span className="text-amber-400/80 text-xs">尚未驗證</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>

        {/* ── Left: Tabbed Controls ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Stats bar */}
          <div className="px-4 md:px-5 pt-3 pb-0 shrink-0">
            <div className="grid grid-cols-4 gap-2 mb-3">
              <StatBadge label="已載入" value={String(vibes.length)} tone="blue" />
              <StatBadge label="我的"   value={String(mineCount)}    tone="violet" />
              <StatBadge label="作者數" value={String(authorOptions.length)} tone="emerald" />
              <StatBadge label="活動"   value={String(logs.length)}  tone="amber" />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="px-4 md:px-5 shrink-0">
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07]">
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                const cfg = accentConfig[tab.accent];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                      active
                        ? `${cfg.tabActive} shadow-[0_2px_12px_rgba(0,0,0,0.3)]`
                        : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[13px] ${active ? cfg.icon : ''}`}>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-5 py-3 space-y-3">

            {/* ── Tab: 資料建立 ── */}
            {activeTab === 'data' && (
              <>
                {/* Account Factory */}
                <Section title="帳號工廠" icon="person_add" accent="violet">
                  <p className="text-white/35 text-xs leading-relaxed mb-3">
                    透過 Supabase Auth 產生隨機 Email 帳號。若啟用自動驗證可立即使用。
                  </p>
                  <button
                    onClick={generateAccount}
                    disabled={genLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">{genLoading ? 'hourglass_top' : 'add_circle'}</span>
                    {genLoading ? '建立中…' : '產生隨機帳號'}
                  </button>

                  {genAccounts.length > 0 && (
                    <div className="space-y-1.5 mt-3 max-h-52 overflow-y-auto pr-0.5">
                      {genAccounts.map((acc, i) => (
                        <div key={i} className={`rounded-lg border p-2.5 transition-colors ${
                          acc.status === 'created' ? 'border-emerald-500/25 bg-emerald-500/5' :
                          acc.status === 'error'   ? 'border-red-500/25 bg-red-500/5' :
                          'border-white/8 bg-white/[0.02]'
                        }`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  acc.status === 'created' ? 'bg-emerald-400' :
                                  acc.status === 'error'   ? 'bg-red-400' : 'bg-white/20'
                                }`} />
                                <span className="text-white/70 text-xs truncate font-medium">{acc.username}</span>
                                <span className={`text-[10px] px-1 py-px rounded font-semibold ${
                                  acc.status === 'created' ? 'text-emerald-400 bg-emerald-400/10' :
                                  acc.status === 'error'   ? 'text-red-400 bg-red-400/10' :
                                  'text-white/30 bg-white/5'
                                }`}>{acc.status === 'created' ? '已建立' : acc.status === 'error' ? '錯誤' : '等待中'}</span>
                              </div>
                              <div className="text-white/35 text-[11px] truncate pl-3">{acc.email}</div>
                              <div className="text-white/35 text-[11px] pl-3 font-mono tracking-tight">{acc.password}</div>
                              {acc.note && <div className="text-amber-400/60 text-[10px] pl-3 mt-0.5">{acc.note}</div>}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => navigator.clipboard.writeText(`${acc.email}\n${acc.password}`)}
                                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded text-[10px] text-white/50 hover:text-white/80 transition-all cursor-pointer"
                              >
                                複製
                              </button>
                              {acc.status === 'created' && (
                                <button
                                  onClick={() => loginAs(acc)}
                                  className="px-2 py-1 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 rounded text-violet-300 text-[10px] transition-all cursor-pointer"
                                >
                                  登入
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Vibe Factory */}
                <Section title="Vibe 產生器" icon="rocket_launch" accent="emerald">
                  {!dbUser && <AuthWarning />}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white/35 text-xs">數量</span>
                      <div className="flex gap-1 flex-wrap">
                        {[1, 5, 10, 50, 100].map(n => (
                          <button
                            key={n}
                            onClick={() => setVibeCount(n)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150 cursor-pointer ${
                              vibeCount === n
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        <input
                          type="number"
                          value={vibeCount}
                          min={1}
                          max={500}
                          onChange={e => setVibeCount(Math.max(1, Math.min(500, Number(e.target.value))))}
                          className="w-16 px-2 py-1 bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-md text-xs text-white outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      onClick={createVibes}
                      disabled={vibeLoading || !dbUser}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${vibeLoading ? 'animate-spin' : ''}`}>
                        {vibeLoading ? 'sync' : 'rocket_launch'}
                      </span>
                      {vibeLoading
                        ? `建立中… (${vibeProgress?.done}/${vibeProgress?.total})`
                        : `建立 ${vibeCount} 個 Vibe`}
                    </button>
                    {vibeLoading && vibeProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/30">
                          <span>進度</span>
                          <span>{Math.round((vibeProgress.done / vibeProgress.total) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                            style={{ width: `${(vibeProgress.done / vibeProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              </>
            )}

            {/* ── Tab: 互動測試 ── */}
            {activeTab === 'interact' && (
              <>
                {/* Remix Tester */}
                <Section title="Remix 測試" icon="fork_right" accent="cyan">
                  {!dbUser && <AuthWarning />}
                  <div className="flex gap-2">
                    <select
                      value={remixTarget}
                      onChange={e => setRemixTarget(e.target.value ? Number(e.target.value) : '')}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-white min-w-0 outline-none transition-colors cursor-pointer"
                    >
                      <option value="">選擇要 Remix 的 Vibe…</option>
                      {vibes.map(v => (
                        <option key={v.id} value={v.id}>#{v.id} — {v.title} (@{v.author_name})</option>
                      ))}
                    </select>
                    <button
                      onClick={remixVibe}
                      disabled={remixLoading || !dbUser || !remixTarget}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">fork_right</span>
                      {remixLoading ? '…' : '建立 Remix'}
                    </button>
                  </div>
                </Section>

                {/* Like Tester */}
                <Section title="按讚測試" icon="favorite" accent="pink">
                  {!supabaseId && <AuthWarning />}
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-white/30 text-xs">已載入 {vibes.length} 個 Vibe</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={loadVibes}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md text-xs text-white/50 hover:text-white/80 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">refresh</span>
                        重新整理
                      </button>
                      <button
                        onClick={likeAllVibes}
                        disabled={!supabaseId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/25 hover:border-pink-500/40 rounded-md text-pink-300 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">favorite</span>
                        全部按讚
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {vibes.slice(0, 15).map(v => (
                      <div key={v.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-white/20 text-[10px] tabular-nums shrink-0">#{v.id}</span>
                          <span className="text-white/60 truncate text-xs">{v.title}</span>
                          <span className="text-white/25 text-[10px] shrink-0">@{v.author_name}</span>
                        </div>
                        <button
                          onClick={() => toggleLike(v)}
                          disabled={!supabaseId}
                          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] border disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer ${
                            likeMap[v.id]
                              ? 'bg-pink-500/20 border-pink-500/35 text-pink-300'
                              : 'border-white/10 text-white/30 hover:border-pink-500/30 hover:text-pink-400 hover:bg-pink-500/10'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[11px]">{likeMap[v.id] ? 'favorite' : 'favorite_border'}</span>
                          {likeMap[v.id] ? '已讚' : '按讚'}
                        </button>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Follow Tester */}
                <Section title="追蹤測試" icon="person_add_alt" accent="blue">
                  {!supabaseId && <AuthWarning />}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="輸入使用者名稱…"
                      value={followUsername}
                      onChange={e => setFollowUsername(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && toggleFollow(followUsername)}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none transition-colors"
                    />
                    <button
                      onClick={() => toggleFollow(followUsername)}
                      disabled={followLoading || !supabaseId || !followUsername.trim()}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer"
                    >
                      {followLoading ? '…' : followStatus[followUsername] ? '取消追蹤' : '追蹤'}
                    </button>
                  </div>
                  <div className="space-y-0.5 max-h-36 overflow-y-auto">
                    {Array.from(new Map(vibes.map(v => [v.author_name, v])).values()).slice(0, 8).map(v => (
                      <div key={v.author_name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <span className="text-white/50 text-xs">@{v.author_name}</span>
                        <button
                          onClick={() => { setFollowUsername(v.author_name); toggleFollow(v.author_name); }}
                          disabled={!supabaseId}
                          className={`px-2.5 py-1 rounded-md text-[10px] border disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer ${
                            followStatus[v.author_name]
                              ? 'bg-blue-500/20 border-blue-500/35 text-blue-300'
                              : 'border-white/10 text-white/30 hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/10'
                          }`}
                        >
                          {followStatus[v.author_name] ? '追蹤中' : '+ 追蹤'}
                        </button>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Comment Tester — NEW */}
                <Section title="留言測試" icon="comment" accent="amber">
                  {!dbUser && <AuthWarning />}
                  <div className="space-y-2">
                    <select
                      value={commentVibeId}
                      onChange={e => setCommentVibeId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer"
                    >
                      <option value="">選擇目標 Vibe…</option>
                      {vibes.map(v => (
                        <option key={v.id} value={v.id}>#{v.id} — {v.title}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="留言內容…"
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && postComment()}
                        className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none transition-colors"
                      />
                      <button
                        onClick={postComment}
                        disabled={commentLoading || !dbUser || !commentVibeId || !commentText.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold shrink-0 transition-all duration-200 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">send</span>
                        {commentLoading ? '…' : '送出'}
                      </button>
                    </div>
                    <p className="text-white/25 text-[11px]">按 Enter 或點送出，留言會出現在該 Vibe 的詳情頁。</p>
                  </div>
                </Section>
              </>
            )}

            {/* ── Tab: 清理中心 ── */}
            {activeTab === 'cleanup' && (
              <Section title="清理中心" icon="delete_sweep" accent="red">
                {!supabaseId && <AuthWarning text="需要登入。你只能刪除目前帳號有權限的專案（通常是自己建立的）。" />}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-2">
                    <input
                      type="text"
                      value={cleanupQuery}
                      onChange={e => setCleanupQuery(e.target.value)}
                      placeholder="搜尋 ID / 標題 / 作者…"
                      className="bg-white/5 border border-white/10 focus:border-red-400/50 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none transition-colors"
                    />
                    <select
                      value={cleanupAuthor}
                      onChange={e => setCleanupAuthor(e.target.value)}
                      className="bg-white/5 border border-white/10 focus:border-red-400/50 rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="all">所有作者</option>
                      {authorOptions.map(opt => (
                        <option key={opt.name} value={opt.name}>
                          @{opt.name} ({opt.count})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={loadVibes}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 text-xs transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">refresh</span>
                      更新
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={selectAllVisible}
                      disabled={filteredCleanupVibes.length === 0}
                      className="px-2.5 py-1 rounded-md border border-white/12 text-white/70 hover:text-white hover:border-white/25 disabled:opacity-35 disabled:cursor-not-allowed text-[11px] transition-colors cursor-pointer"
                    >
                      全選目前結果 ({filteredCleanupVibes.length})
                    </button>
                    <button
                      onClick={clearSelected}
                      disabled={selectedDeleteIds.length === 0}
                      className="px-2.5 py-1 rounded-md border border-white/12 text-white/45 hover:text-white/80 hover:border-white/25 disabled:opacity-35 disabled:cursor-not-allowed text-[11px] transition-colors cursor-pointer"
                    >
                      清空勾選
                    </button>
                    {dbUser && (
                      <button
                        onClick={() => setCleanupAuthor(dbUser.username)}
                        className="px-2.5 py-1 rounded-md border border-violet-400/30 text-violet-300 hover:bg-violet-500/10 text-[11px] transition-colors cursor-pointer"
                      >
                        只看我的專案
                      </button>
                    )}
                    <span className="text-[11px] text-white/35">
                      已勾選 {selectedDeleteIds.length} 筆（可見 {selectedVisibleCount} 筆）
                    </span>
                  </div>

                  <div className="rounded-lg border border-white/[0.08] bg-black/15 overflow-hidden">
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                      {filteredCleanupVibes.length === 0 && (
                        <div className="px-3 py-6 text-center text-white/30 text-xs">沒有符合條件的專案</div>
                      )}
                      {filteredCleanupVibes.map(v => {
                        const selected = selectedDeleteIds.includes(v.id);
                        return (
                          <div key={v.id} className={`px-3 py-2.5 flex items-center gap-2.5 ${selected ? 'bg-red-500/8' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(v.id)}
                              className="w-4 h-4 cursor-pointer accent-red-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-white/25 text-[10px] shrink-0">#{v.id}</span>
                                <span className="text-white/75 text-xs truncate">{v.title}</span>
                              </div>
                              <div className="text-[10px] text-white/30 mt-0.5">
                                @{v.author_name} · {formatRelativeTime(v.created_at)}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteSingleVibe(v)}
                              disabled={!supabaseId || cleanupDeleting}
                              className="shrink-0 px-2.5 py-1 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] transition-colors cursor-pointer"
                            >
                              刪除
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={deleteSelectedVibes}
                      disabled={!supabaseId || selectedDeleteIds.length === 0 || cleanupDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-700/35 hover:bg-red-700/50 border border-red-500/35 text-red-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${cleanupDeleting ? 'animate-spin' : ''}`}>
                        {cleanupDeleting ? 'sync' : 'delete_forever'}
                      </span>
                      {cleanupDeleting ? '刪除中…' : `刪除已勾選 (${selectedDeleteIds.length})`}
                    </button>
                    <button
                      onClick={async () => {
                        if (!supabaseId || !dbUser) return;
                        const mine = vibes.filter(v => v.author_name === dbUser.username);
                        if (mine.length === 0) { addLog('warn', '目前沒有可刪除的我的專案'); return; }
                        if (!confirm(`確定刪除你帳號下的 ${mine.length} 個專案？`)) return;
                        setCleanupDeleting(true);
                        let ok = 0;
                        for (const v of mine) {
                          try { await api.deleteVibe(v.id, supabaseId); ok++; } catch {}
                        }
                        setCleanupDeleting(false);
                        addLog('ok', `已刪除我的專案 ${ok}/${mine.length}`);
                        await loadVibes();
                      }}
                      disabled={!dbUser || cleanupDeleting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/6 hover:bg-white/10 border border-white/12 text-white/70 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">auto_delete</span>
                      一鍵刪除我的全部
                    </button>
                  </div>
                </div>
              </Section>
            )}

            {/* ── Tab: 系統健診 (NEW) ── */}
            {activeTab === 'system' && (
              <>
                {/* API Ping */}
                <Section title="API 連線測試" icon="wifi_tethering" accent="emerald">
                  <p className="text-white/35 text-xs leading-relaxed mb-3">
                    測試後端 API 端點回應速度，確認服務正常運作中。
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={pingApi}
                      disabled={pingLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all duration-200 cursor-pointer"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${pingLoading ? 'animate-spin' : ''}`}>
                        {pingLoading ? 'sync' : 'wifi_tethering'}
                      </span>
                      {pingLoading ? '測試中…' : 'Ping API'}
                    </button>
                    {pingResult && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        pingResult.ok
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-red-500/30 bg-red-500/10 text-red-300'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {pingResult.ok ? 'check_circle' : 'error'}
                        </span>
                        {pingResult.msg}
                      </div>
                    )}
                  </div>

                  {/* Response time indicator */}
                  {pingResult?.ok && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-white/35">
                        <span>回應速度</span>
                        <span className={
                          pingResult.ms < 200 ? 'text-emerald-400' :
                          pingResult.ms < 500 ? 'text-amber-400' : 'text-red-400'
                        }>
                          {pingResult.ms < 200 ? '極快' : pingResult.ms < 500 ? '正常' : '偏慢'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pingResult.ms < 200 ? 'bg-emerald-500' :
                            pingResult.ms < 500 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (pingResult.ms / 1000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Section>

                {/* DB Stats */}
                <Section title="資料庫統計" icon="storage" accent="cyan">
                  <p className="text-white/35 text-xs leading-relaxed mb-3">
                    查看目前資料庫中的 Vibe 數量與使用者分佈。
                  </p>
                  <button
                    onClick={loadDbStats}
                    disabled={dbStatsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold transition-all duration-200 cursor-pointer mb-3"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${dbStatsLoading ? 'animate-spin' : ''}`}>
                      {dbStatsLoading ? 'sync' : 'refresh'}
                    </span>
                    {dbStatsLoading ? '載入中…' : '取得統計'}
                  </button>

                  {dbStats && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-cyan-300 tabular-nums">{dbStats.vibes}</div>
                        <div className="text-[11px] text-white/40 mt-0.5">Vibe 總數</div>
                      </div>
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-violet-300 tabular-nums">{dbStats.authors}</div>
                        <div className="text-[11px] text-white/40 mt-0.5">活躍作者</div>
                      </div>
                    </div>
                  )}
                </Section>

                {/* Environment info */}
                <Section title="環境資訊" icon="info" accent="blue">
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: 'Origin',    value: window.location.origin },
                      { label: 'UA',        value: navigator.userAgent.slice(0, 60) + '…' },
                      { label: 'Timestamp', value: new Date().toISOString() },
                      { label: 'Supabase',  value: supabaseId ? `已驗證 (${supabaseId.slice(0, 12)}…)` : '未登入' },
                      { label: 'DB User',   value: dbUser ? `@${dbUser.username} (id:${dbUser.id})` : '—' },
                    ].map(row => (
                      <div key={row.label} className="flex gap-2 items-start px-2.5 py-1.5 rounded-md bg-white/[0.025] hover:bg-white/[0.04] transition-colors group">
                        <span className="text-white/30 shrink-0 w-20 text-[11px]">{row.label}</span>
                        <span
                          className="text-white/60 break-all leading-snug text-[11px] flex-1 cursor-pointer group-hover:text-white/80 transition-colors"
                          onClick={() => { navigator.clipboard.writeText(row.value); addLog('ok', `已複製：${row.label}`); }}
                          title="點擊複製"
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

          </div>
        </div>

        {/* ── Right: Activity Log ── */}
        <div className={`
          xl:flex xl:flex-col xl:w-[300px] xl:shrink-0 xl:border-l xl:border-white/[0.08] xl:bg-[#060810]/90
          ${showLog
            ? 'fixed inset-0 z-30 flex flex-col bg-[#060810] pt-[57px]'
            : 'hidden xl:flex'}
        `}>
          {/* Log header */}
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[13px] text-white/25">terminal</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">活動紀錄</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportLog}
                disabled={logs.length === 0}
                className="text-white/20 hover:text-white/50 text-[10px] transition-colors disabled:opacity-30 cursor-pointer"
                title="複製全部記錄"
              >
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
              </button>
              <button
                onClick={() => setLogs([])}
                className="text-white/20 hover:text-white/50 text-[10px] transition-colors cursor-pointer"
              >
                清空
              </button>
              {/* Mobile close */}
              <button
                onClick={() => setShowLog(false)}
                className="xl:hidden text-white/30 hover:text-white/70 transition-colors cursor-pointer ml-1"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Log level filter */}
          <div className="px-3 py-2 border-b border-white/[0.04] flex gap-1 shrink-0">
            {(['all', 'ok', 'err', 'warn', 'info'] as const).map(lvl => {
              const count = lvl === 'all' ? logs.length : logs.filter(l => l.level === lvl).length;
              const active = logFilter === lvl;
              const color = lvl === 'all' ? 'text-white/50' : logColor[lvl as LogEntry['level']];
              return (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    active ? 'bg-white/10 ' + color : 'text-white/25 hover:text-white/40'
                  }`}
                >
                  {lvl === 'all' ? 'ALL' : lvl.toUpperCase()}
                  {count > 0 && <span className={`tabular-nums ${color}`}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Log entries */}
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-px text-[11px]">
            {filteredLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pb-8">
                <span className="material-symbols-outlined text-white/10 text-[32px] mb-2">terminal</span>
                <div className="text-white/15">{logFilter === 'all' ? '等待事件中…' : `沒有 ${logFilter.toUpperCase()} 記錄`}</div>
              </div>
            )}
            {filteredLogs.map(l => (
              <div key={l.id} className={`flex gap-2 px-2 py-1 rounded ${logBg[l.level]}`}>
                <span className="text-white/20 shrink-0 tabular-nums w-14">{l.ts}</span>
                <span className={`material-symbols-outlined text-[12px] shrink-0 ${logColor[l.level]}`}>
                  {logIcon[l.level]}
                </span>
                <span className={`${logColor[l.level]} break-all leading-relaxed`}>{l.msg}</span>
              </div>
            ))}
          </div>

          {/* Bottom status */}
          <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${dbUser ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <span className="text-white/25 text-[10px]">
              {dbUser ? `已驗證身分：@${dbUser.username}` : '目前沒有有效工作階段'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Accent config ────────────────────────────────────────────────────────────
const accentConfig: Record<string, {
  border: string; glow: string; icon: string; label: string; tabActive: string;
}> = {
  violet:  { border: 'border-violet-500/22',  glow: 'bg-violet-500',  icon: 'text-violet-300',  label: 'bg-violet-500/10 text-violet-300',  tabActive: 'bg-violet-500/15 text-violet-200'  },
  emerald: { border: 'border-emerald-500/22', glow: 'bg-emerald-500', icon: 'text-emerald-300', label: 'bg-emerald-500/10 text-emerald-300', tabActive: 'bg-emerald-500/15 text-emerald-200' },
  cyan:    { border: 'border-cyan-500/22',    glow: 'bg-cyan-500',    icon: 'text-cyan-300',    label: 'bg-cyan-500/10 text-cyan-300',    tabActive: 'bg-cyan-500/15 text-cyan-200'    },
  pink:    { border: 'border-pink-500/22',    glow: 'bg-pink-500',    icon: 'text-pink-300',    label: 'bg-pink-500/10 text-pink-300',    tabActive: 'bg-pink-500/15 text-pink-200'    },
  blue:    { border: 'border-blue-500/22',    glow: 'bg-blue-500',    icon: 'text-blue-300',    label: 'bg-blue-500/10 text-blue-300',    tabActive: 'bg-blue-500/15 text-blue-200'    },
  red:     { border: 'border-red-500/22',     glow: 'bg-red-500',     icon: 'text-red-300',     label: 'bg-red-500/10 text-red-300',     tabActive: 'bg-red-500/15 text-red-200'     },
  amber:   { border: 'border-amber-500/22',   glow: 'bg-amber-500',   icon: 'text-amber-300',   label: 'bg-amber-500/10 text-amber-300',   tabActive: 'bg-amber-500/15 text-amber-200'   },
};

// ─── StatBadge ────────────────────────────────────────────────────────────────
function StatBadge({ label, value, tone }: { label: string; value: string; tone: string }) {
  const cfg = accentConfig[tone] ?? accentConfig.blue;
  return (
    <div className={`rounded-xl border ${cfg.border} bg-black/20 px-3 py-2.5 text-center`}>
      <div className="text-[10px] text-white/30 uppercase tracking-[0.12em] truncate">{label}</div>
      <div className={`mt-1 text-lg font-bold leading-none tabular-nums ${cfg.icon}`}>{value}</div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({
  title, icon, accent = 'violet', children
}: {
  title: string; icon: string; accent?: string; children: React.ReactNode;
}) {
  const cfg = accentConfig[accent] ?? accentConfig.violet;
  return (
    <div className={`rounded-xl border ${cfg.border} bg-black/20 shadow-[0_8px_30px_rgba(0,0,0,0.18)] overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
        <span className={`material-symbols-outlined text-[15px] ${cfg.icon}`}>{icon}</span>
        <span className="text-white/78 font-semibold text-xs tracking-wide">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Auth warning ─────────────────────────────────────────────────────────────
function AuthWarning({ text = '使用此工具需要登入' }: { text?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-md bg-amber-500/8 border border-amber-500/20">
      <span className="material-symbols-outlined text-[13px] text-amber-400">lock</span>
      <span className="text-amber-400/70 text-[11px]">{text}</span>
    </div>
  );
}
