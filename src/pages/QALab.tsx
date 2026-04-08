import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function QALab() {
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [supabaseId, setSupabaseId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  // Account generator state
  const [genAccounts, setGenAccounts] = useState<GeneratedAccount[]>([]);
  const [genLoading, setGenLoading] = useState(false);

  // Vibe factory state
  const [vibeCount, setVibeCount] = useState(1);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeProgress, setVibeProgress] = useState<{ done: number; total: number } | null>(null);

  // Remix state
  const [remixTarget, setRemixTarget] = useState<number | ''>('');
  const [remixLoading, setRemixLoading] = useState(false);

  // Like state (vibeId -> liked)
  const [likeMap, setLikeMap] = useState<Record<number, boolean>>({});

  // Follow state
  const [followUsername, setFollowUsername] = useState('');
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState(false);

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
    } catch (e: any) { addLog('err', `Auth sync failed: ${e.message}`); }
  };

  // ── Load vibes ─────────────────────────────────────────────────────────────
  useEffect(() => { loadVibes(); }, []);

  const loadVibes = async () => {
    try {
      const all = await api.getVibes();
      setVibes(all.slice(0, 30));
    } catch (e: any) { addLog('err', `Load vibes: ${e.message}`); }
  };

  // ── Log ────────────────────────────────────────────────────────────────────
  const addLog = useCallback((level: LogEntry['level'], msg: string) => {
    const id = ++logIdRef.current;
    const ts = new Date().toLocaleTimeString('en', { hour12: false });
    setLogs(prev => [...prev.slice(-199), { id, ts, level, msg }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ── Account Generator ──────────────────────────────────────────────────────
  const generateAccount = async () => {
    const uid = randomId();
    const email = `qa_${uid}@vibejam.test`;
    const username = `qa_${uid}`;
    const password = `QATest_${uid}!`;
    const acc: GeneratedAccount = { email, password, username, status: 'pending' };
    setGenAccounts(prev => [acc, ...prev.slice(0, 9)]);
    setGenLoading(true);
    addLog('info', `Creating account: ${username}`);
    try {
      await signUpWithEmail(email, password, username);
      setGenAccounts(prev => prev.map(a => a.email === email ? { ...a, status: 'created', note: 'Check email if confirmation required' } : a));
      addLog('ok', `Account created: ${username} / ${email}`);
    } catch (e: any) {
      setGenAccounts(prev => prev.map(a => a.email === email ? { ...a, status: 'error', note: e.message } : a));
      addLog('err', `Account failed: ${e.message}`);
    } finally { setGenLoading(false); }
  };

  const loginAs = async (acc: GeneratedAccount) => {
    addLog('info', `Signing in as ${acc.username}...`);
    try {
      await signInWithEmail(acc.email, acc.password);
      addLog('ok', `Signed in as ${acc.username}`);
    } catch (e: any) { addLog('err', `Sign-in failed: ${e.message}`); }
  };

  // ── Vibe Factory ───────────────────────────────────────────────────────────
  const createVibes = async () => {
    if (!dbUser) { addLog('err', 'Must be logged in to create vibes'); return; }
    setVibeLoading(true);
    setVibeProgress({ done: 0, total: vibeCount });
    addLog('info', `Creating ${vibeCount} vibe(s)...`);
    let created = 0;
    for (let i = 0; i < vibeCount; i++) {
      const tpl = randomItem(VIBE_TEMPLATES);
      const suffix = randomId();
      try {
        const res = await api.createVibe({
          title: `${tpl.title} ${suffix}`,
          tags: tpl.tags,
          code: tpl.code,
          description: `QA test vibe #${i + 1}`,
          author_id: dbUser.id,
          visibility: 'public',
        });
        addLog('ok', `Vibe created: "${tpl.title} ${suffix}" (id:${res.id})`);
        created++;
      } catch (e: any) { addLog('err', `Vibe #${i + 1} failed: ${e.message}`); }
      setVibeProgress({ done: i + 1, total: vibeCount });
    }
    addLog('ok', `Done: ${created}/${vibeCount} vibes created`);
    setVibeLoading(false);
    setVibeProgress(null);
    loadVibes();
  };

  // ── Remix ──────────────────────────────────────────────────────────────────
  const remixVibe = async () => {
    if (!dbUser) { addLog('err', 'Must be logged in to remix'); return; }
    if (!remixTarget) { addLog('warn', 'Select a vibe to remix'); return; }
    const parent = vibes.find(v => v.id === Number(remixTarget));
    if (!parent) return;
    setRemixLoading(true);
    addLog('info', `Remixing "${parent.title}" (id:${parent.id})...`);
    try {
      const res = await api.createVibe({
        title: `Remix of ${parent.title} [${randomId()}]`,
        tags: parent.tags || 'SaaS UI',
        code: parent.latest_code || '<div>Remixed!</div>',
        description: `QA remix of vibe #${parent.id}`,
        author_id: dbUser.id,
        parent_vibe_id: parent.id,
        parent_version_number: parent.latest_version || 1,
        visibility: 'public',
      });
      addLog('ok', `Remix created (id:${res.id}) from "${parent.title}"`);
      loadVibes();
    } catch (e: any) { addLog('err', `Remix failed: ${e.message}`); }
    setRemixLoading(false);
  };

  // ── Like ───────────────────────────────────────────────────────────────────
  const toggleLike = async (vibe: Vibe) => {
    if (!supabaseId) { addLog('err', 'Must be logged in to like'); return; }
    try {
      const res = await api.toggleLike(vibe.id, supabaseId);
      setLikeMap(prev => ({ ...prev, [vibe.id]: res.liked }));
      addLog('ok', `${res.liked ? 'Liked' : 'Unliked'} "${vibe.title}" (${res.like_count} likes)`);
    } catch (e: any) { addLog('err', `Like failed: ${e.message}`); }
  };

  // ── Follow ─────────────────────────────────────────────────────────────────
  const toggleFollow = async (username: string) => {
    if (!supabaseId) { addLog('err', 'Must be logged in to follow'); return; }
    if (!username.trim()) { addLog('warn', 'Enter a username'); return; }
    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(username.trim(), supabaseId);
      setFollowStatus(prev => ({ ...prev, [username]: res.following }));
      addLog('ok', `${res.following ? 'Following' : 'Unfollowed'} @${username} (${res.followers_count} followers)`);
    } catch (e: any) { addLog('err', `Follow failed: ${e.message}`); }
    setFollowLoading(false);
  };

  // ── Bulk Like All Vibes ────────────────────────────────────────────────────
  const likeAllVibes = async () => {
    if (!supabaseId) { addLog('err', 'Must be logged in'); return; }
    addLog('info', `Liking all ${vibes.length} loaded vibes...`);
    let done = 0;
    for (const v of vibes) {
      try {
        const res = await api.toggleLike(v.id, supabaseId);
        setLikeMap(prev => ({ ...prev, [v.id]: res.liked }));
        done++;
      } catch {}
    }
    addLog('ok', `Liked ${done} vibes`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const logColor: Record<LogEntry['level'], string> = {
    info: 'text-blue-400',
    ok: 'text-green-400',
    err: 'text-red-400',
    warn: 'text-yellow-400',
  };
  const logIcon: Record<LogEntry['level'], string> = {
    info: '·',
    ok: '✓',
    err: '✗',
    warn: '!',
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white font-mono text-sm">
      {/* ── Banner ── */}
      <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 text-yellow-300 text-xs">
        <span className="material-symbols-outlined text-[16px]">science</span>
        <span>QA Lab — Developer testing tools. Not visible to regular users.</span>
      </div>

      <div className="flex h-[calc(100vh-36px)]">
        {/* ── Left: Controls ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Auth Status */}
          <Card title="Auth Status" icon="account_circle">
            {dbUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {dbUser.avatar && <img src={dbUser.avatar} className="w-8 h-8 rounded-full" />}
                  <div>
                    <div className="text-white font-semibold">@{dbUser.username}</div>
                    <div className="text-white/40 text-xs">id: {dbUser.id} · {supabaseId?.slice(0, 8)}…</div>
                  </div>
                </div>
                <button
                  onClick={async () => { await signOut(); addLog('info', 'Signed out'); }}
                  className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 text-xs"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="text-yellow-400 text-xs">Not logged in — account generator & actions require auth</div>
            )}
          </Card>

          {/* Account Generator */}
          <Card title="Account Factory" icon="person_add">
            <div className="space-y-3">
              <p className="text-white/40 text-xs">Generates random email account via Supabase. Works immediately if auto-confirm is enabled in your Supabase project.</p>
              <button
                onClick={generateAccount}
                disabled={genLoading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded text-white text-xs font-semibold"
              >
                {genLoading ? 'Creating…' : 'Generate Random Account'}
              </button>
              {genAccounts.length > 0 && (
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {genAccounts.map((acc, i) => (
                    <div key={i} className={`p-2 rounded border text-xs ${
                      acc.status === 'created' ? 'border-green-500/30 bg-green-500/5' :
                      acc.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                      'border-white/10 bg-white/3'
                    }`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-white/70 truncate"><span className="text-white/30">user:</span> {acc.username}</div>
                          <div className="text-white/70 truncate"><span className="text-white/30">email:</span> {acc.email}</div>
                          <div className="text-white/70"><span className="text-white/30">pass:</span> {acc.password}</div>
                          {acc.note && <div className="text-yellow-400/70">{acc.note}</div>}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${acc.email}\n${acc.password}`)}
                            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs"
                          >
                            Copy
                          </button>
                          {acc.status === 'created' && (
                            <button
                              onClick={() => loginAs(acc)}
                              className="px-2 py-0.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded text-violet-300 text-xs"
                            >
                              Login
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Vibe Factory */}
          <Card title="Vibe Factory" icon="rocket_launch">
            {!dbUser && <div className="text-yellow-400 text-xs mb-2">Login required</div>}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-white/40 text-xs">Count:</label>
                <div className="flex gap-1">
                  {[1, 5, 10, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => setVibeCount(n)}
                      className={`px-2 py-0.5 rounded text-xs border ${vibeCount === n ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/10 text-white/50 hover:border-white/20'}`}
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
                    className="w-16 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                  />
                </div>
              </div>
              <button
                onClick={createVibes}
                disabled={vibeLoading || !dbUser}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded text-white text-xs font-semibold"
              >
                {vibeLoading ? `Creating… (${vibeProgress?.done}/${vibeProgress?.total})` : `Create ${vibeCount} Vibe${vibeCount > 1 ? 's' : ''}`}
              </button>
              {vibeLoading && vibeProgress && (
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(vibeProgress.done / vibeProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Remix Tester */}
          <Card title="Remix Tester" icon="fork_right">
            {!dbUser && <div className="text-yellow-400 text-xs mb-2">Login required</div>}
            <div className="flex gap-2">
              <select
                value={remixTarget}
                onChange={e => setRemixTarget(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white min-w-0"
              >
                <option value="">Select a vibe to remix…</option>
                {vibes.map(v => (
                  <option key={v.id} value={v.id}>#{v.id} — {v.title} (@{v.author_name})</option>
                ))}
              </select>
              <button
                onClick={remixVibe}
                disabled={remixLoading || !dbUser || !remixTarget}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded text-white text-xs font-semibold shrink-0"
              >
                {remixLoading ? 'Remixing…' : 'Remix'}
              </button>
            </div>
          </Card>

          {/* Like Tester */}
          <Card title="Like Tester" icon="favorite">
            {!supabaseId && <div className="text-yellow-400 text-xs mb-2">Login required</div>}
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/40 text-xs">{vibes.length} vibes loaded</span>
              <div className="flex gap-2">
                <button
                  onClick={loadVibes}
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs"
                >
                  Refresh
                </button>
                <button
                  onClick={likeAllVibes}
                  disabled={!supabaseId}
                  className="px-2 py-0.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded text-pink-300 text-xs disabled:opacity-40"
                >
                  Like All
                </button>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1">
              {vibes.slice(0, 15).map(v => (
                <div key={v.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-white/3 hover:bg-white/5">
                  <div className="min-w-0">
                    <span className="text-white/30 text-xs">#{v.id}</span>
                    <span className="text-white/70 ml-2 truncate text-xs">{v.title}</span>
                    <span className="text-white/30 text-xs ml-1">@{v.author_name}</span>
                  </div>
                  <button
                    onClick={() => toggleLike(v)}
                    disabled={!supabaseId}
                    className={`shrink-0 px-2 py-0.5 rounded text-xs border disabled:opacity-40 ${
                      likeMap[v.id]
                        ? 'bg-pink-500/30 border-pink-500/40 text-pink-300'
                        : 'border-white/10 text-white/40 hover:border-pink-500/30 hover:text-pink-400'
                    }`}
                  >
                    {likeMap[v.id] ? '♥ Liked' : '♡ Like'}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Follow Tester */}
          <Card title="Follow Tester" icon="person_add_alt">
            {!supabaseId && <div className="text-yellow-400 text-xs mb-2">Login required</div>}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Enter username…"
                value={followUsername}
                onChange={e => setFollowUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && toggleFollow(followUsername)}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/20"
              />
              <button
                onClick={() => toggleFollow(followUsername)}
                disabled={followLoading || !supabaseId || !followUsername.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded text-white text-xs font-semibold shrink-0"
              >
                {followLoading ? '…' : followStatus[followUsername] ? 'Unfollow' : 'Follow'}
              </button>
            </div>
            {/* Quick-follow from loaded vibes' authors */}
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {Array.from(new Map(vibes.map(v => [v.author_name, v])).values()).slice(0, 8).map(v => (
                <div key={v.author_name} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-white/3">
                  <span className="text-white/60 text-xs">@{v.author_name}</span>
                  <button
                    onClick={() => { setFollowUsername(v.author_name); toggleFollow(v.author_name); }}
                    disabled={!supabaseId}
                    className={`px-2 py-0.5 rounded text-xs border disabled:opacity-40 ${
                      followStatus[v.author_name]
                        ? 'bg-blue-500/30 border-blue-500/40 text-blue-300'
                        : 'border-white/10 text-white/40 hover:border-blue-500/30 hover:text-blue-400'
                    }`}
                  >
                    {followStatus[v.author_name] ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Cleanup */}
          <Card title="Cleanup" icon="delete_sweep">
            {!dbUser && <div className="text-yellow-400 text-xs mb-2">Login required — only deletes YOUR vibes</div>}
            <button
              onClick={async () => {
                if (!supabaseId || !dbUser) return;
                if (!confirm('Delete all vibes created by your account?')) return;
                const mine = vibes.filter(v => v.author_name === dbUser.username);
                addLog('info', `Deleting ${mine.length} vibes…`);
                let n = 0;
                for (const v of mine) {
                  try { await api.deleteVibe(v.id, supabaseId); n++; } catch {}
                }
                addLog('ok', `Deleted ${n} vibes`);
                loadVibes();
              }}
              disabled={!dbUser}
              className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/40 text-red-400 disabled:opacity-40 rounded text-xs font-semibold"
            >
              Delete My Vibes
            </button>
          </Card>

        </div>

        {/* ── Right: Activity Log ── */}
        <div className="w-80 shrink-0 border-l border-white/5 flex flex-col">
          <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center">
            <span className="text-white/40 text-xs uppercase tracking-widest">Activity Log</span>
            <button onClick={() => setLogs([])} className="text-white/20 hover:text-white/50 text-xs">Clear</button>
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
            {logs.length === 0 && (
              <div className="text-white/20 text-center mt-8">Actions will appear here</div>
            )}
            {logs.map(l => (
              <div key={l.id} className="flex gap-2">
                <span className="text-white/20 shrink-0 w-16">{l.ts}</span>
                <span className={`shrink-0 ${logColor[l.level]}`}>{logIcon[l.level]}</span>
                <span className={`${logColor[l.level]} break-all`}>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card helper ──────────────────────────────────────────────────────────────
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/8 rounded-lg bg-white/2">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <span className="material-symbols-outlined text-[16px] text-white/30">{icon}</span>
        <span className="text-white/60 font-semibold text-xs uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
