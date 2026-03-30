/**
 * Cold Start Seed Script
 * Run: npx tsx seed.ts
 * Adds 5 cool demo vibes to Supabase
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, initializeDatabase } from './src/lib/dbPostgres.js';

// Get or create a seed user
async function main() {
  await initializeDatabase();

  let user = await db.get('SELECT id FROM users WHERE username = $1', ['BeaverBot']);
  if (!user) {
    user = await db.get(
      'INSERT INTO users (username, avatar) VALUES ($1, $2) RETURNING id',
      ['BeaverBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=BeaverBot']
    );
  }
  const userId = user.id;

  const vibes = [
  {
    title: 'Matrix Rain',
    tags: 'Canvas, Animation, Cyberpunk',
    code: `<!DOCTYPE html><html><head><style>
body{margin:0;background:#000;overflow:hidden}
canvas{display:block}
</style></head><body>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const cols=Math.floor(c.width/16),drops=Array(cols).fill(1);
const chars='ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
function draw(){
  ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#0f0';ctx.font='16px monospace';
  drops.forEach((y,i)=>{
    const ch=chars[Math.floor(Math.random()*chars.length)];
    ctx.fillStyle=y===1?'#fff':'#0f0';
    ctx.fillText(ch,i*16,y*16);
    if(y*16>c.height&&Math.random()>0.975)drops[i]=0;
    drops[i]++;
  });
}
setInterval(draw,33);
</script></body></html>`
  },
  {
    title: 'Neon Ripple Button',
    tags: 'CSS, Interaction, Neon',
    code: `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
.btn{position:relative;padding:18px 52px;font-size:18px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#fff;background:transparent;border:2px solid #7c3aed;border-radius:4px;cursor:pointer;overflow:hidden;transition:color .3s}
.btn::before{content:'';position:absolute;top:50%;left:50%;width:0;height:0;background:rgba(124,58,237,.4);border-radius:50%;transform:translate(-50%,-50%);transition:width .6s,height .6s}
.btn:hover{color:#c4b5fd;box-shadow:0 0 20px #7c3aed,0 0 60px #7c3aed44,inset 0 0 20px rgba(124,58,237,.1)}
.btn:hover::before{width:400px;height:400px}
.glow{position:absolute;inset:0;border-radius:4px;opacity:0;box-shadow:0 0 30px #7c3aed;transition:opacity .3s}
.btn:hover .glow{opacity:1}
</style></head><body>
<button class="btn"><span class="glow"></span>Jam It Out!</button>
</body></html>`
  },
  {
    title: 'Particle Galaxy',
    tags: 'Canvas, Generative Art, Space',
    code: `<!DOCTYPE html><html><head><style>
body{margin:0;background:#000;overflow:hidden}
canvas{display:block}
</style></head><body>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const cx=c.width/2,cy=c.height/2,N=800;
const stars=Array.from({length:N},()=>{
  const a=Math.random()*Math.PI*2,r=Math.random()*250+10;
  const spin=Math.random()*0.002+0.0005;
  const hue=200+Math.random()*80;
  return{a,r,spin,hue,size:Math.random()*2+0.5,drift:Math.random()*0.3-0.15};
});
function draw(){
  ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(0,0,c.width,c.height);
  stars.forEach(s=>{
    s.a+=s.spin;
    const x=cx+Math.cos(s.a)*s.r+s.drift*Math.sin(s.a*3);
    const y=cy+Math.sin(s.a)*s.r*0.45+s.drift*Math.cos(s.a*2);
    ctx.beginPath();ctx.arc(x,y,s.size,0,Math.PI*2);
    ctx.fillStyle=\`hsla(\${s.hue},100%,80%,0.85)\`;ctx.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`
  },
  {
    title: 'Glassmorphic Dashboard',
    tags: 'SaaS, Glassmorphism, Dashboard',
    code: `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4c1d95 100%);font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}
.dash{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:600px;width:100%}
.card{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:24px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff}
.card.wide{grid-column:span 2}
.label{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:10px}
.value{font-size:2.4rem;font-weight:800;background:linear-gradient(90deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.bar-wrap{margin-top:12px;height:6px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}
.bar{height:100%;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#ec4899)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
.row{display:flex;align-items:center;margin-top:8px;font-size:13px;color:rgba(255,255,255,.6)}
</style></head><body>
<div class="dash">
  <div class="card wide">
    <div class="label">Total Vibes Published</div>
    <div class="value">2,847</div>
    <div class="bar-wrap"><div class="bar" style="width:73%"></div></div>
    <div class="row"><span class="dot" style="background:#34d399"></span>+12% this week</div>
  </div>
  <div class="card">
    <div class="label">Live Users</div>
    <div class="value">148</div>
    <div class="row"><span class="dot" style="background:#60a5fa"></span>Online now</div>
  </div>
  <div class="card">
    <div class="label">Remixes</div>
    <div class="value">391</div>
    <div class="bar-wrap"><div class="bar" style="width:55%"></div></div>
  </div>
  <div class="card">
    <div class="label">Top Tag</div>
    <div class="value" style="font-size:1.4rem">#NeonUI</div>
    <div class="row" style="margin-top:10px">🔥 Trending</div>
  </div>
  <div class="card wide">
    <div class="label">Activity Sparkline</div>
    <svg viewBox="0 0 200 50" style="width:100%;margin-top:8px">
      <polyline points="0,40 25,30 50,35 75,15 100,25 125,10 150,20 175,8 200,14" fill="none" stroke="url(#g)" stroke-width="2.5" stroke-linecap="round"/>
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs>
    </svg>
  </div>
</div>
</body></html>`
  },
  {
    title: 'Bouncy Ball Physics',
    tags: 'Canvas, Physics, Game',
    code: `<!DOCTYPE html><html><head><style>
body{margin:0;background:#111;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh}
canvas{border-radius:16px;border:1px solid rgba(255,255,255,.1)}
</style></head><body>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=c.height=Math.min(window.innerWidth,window.innerHeight)-40;
const W=c.width,H=c.height,N=12;
const colors=['#f472b6','#818cf8','#34d399','#fb923c','#60a5fa','#a78bfa','#fbbf24'];
const balls=Array.from({length:N},(_,i)=>({
  x:W/2+Math.random()*60-30,y:H/2+Math.random()*60-30,
  r:18+Math.random()*22,
  vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,
  color:colors[i%colors.length]
}));
function draw(){
  ctx.fillStyle='rgba(17,17,17,.25)';ctx.fillRect(0,0,W,H);
  balls.forEach(b=>{
    b.x+=b.vx;b.y+=b.vy;b.vy+=0.18;
    if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx)*0.85;}
    if(b.x+b.r>W){b.x=W-b.r;b.vx=-Math.abs(b.vx)*0.85;}
    if(b.y+b.r>H){b.y=H-b.r;b.vy=-Math.abs(b.vy)*0.82;b.vx*=0.97;}
    if(b.y-b.r<0){b.y=b.r;b.vy=Math.abs(b.vy)*0.8;}
    const g=ctx.createRadialGradient(b.x-b.r*.3,b.y-b.r*.3,b.r*.05,b.x,b.y,b.r);
    g.addColorStop(0,'#fff');g.addColorStop(0.3,b.color);g.addColorStop(1,b.color+'44');
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
  });
  requestAnimationFrame(draw);
}
draw();
</script></body></html>`
  },
  {
    title: 'MiniMax API Key Tester',
    tags: 'AI, MiniMax, API, Tool',
    code: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MiniMax Key Tester</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d0d;color:#e5e2e1;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 16px}
h1{font-size:22px;font-weight:800;letter-spacing:-0.03em;margin-bottom:4px}
.sub{font-size:13px;color:rgba(229,226,225,0.45);margin-bottom:28px}
.card{width:100%;max-width:480px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:16px}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.logo-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1a6bff,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:20px}
.label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(229,226,225,0.4);margin-bottom:6px}
.input-wrap{position:relative}
input[type=password],input[type=text]{width:100%;padding:12px 42px 12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#111;color:#e5e2e1;font-size:13px;font-family:monospace;outline:none;transition:all 0.2s}
input:focus{border-color:rgba(99,149,255,0.5);box-shadow:0 0 0 3px rgba(99,149,255,0.08)}
.eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(229,226,225,0.35);cursor:pointer;font-size:16px;padding:2px}
.btn{padding:13px;border-radius:12px;border:none;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;letter-spacing:0.01em}
.btn-test{background:linear-gradient(135deg,#1a6bff,#7c3aed);color:#fff}
.btn-test:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-test:active{transform:translateY(0)}
.btn-test:disabled{opacity:0.4;cursor:not-allowed;transform:none;filter:none}
.result{border-radius:14px;padding:16px;font-size:13px;display:none}
.result.ok{background:rgba(108,219,162,0.1);border:1px solid rgba(108,219,162,0.2);color:#6cdba2}
.result.err{background:rgba(255,100,100,0.1);border:1px solid rgba(255,100,100,0.2);color:#ff7070}
.result.testing{background:rgba(255,183,0,0.08);border:1px solid rgba(255,183,0,0.15);color:#ffd060}
.result-icon{font-size:20px;margin-right:8px}
.result-title{font-weight:700;margin-bottom:4px;display:flex;align-items:center}
.result-body{color:inherit;opacity:0.75;line-height:1.5;font-size:12px}
.divider{height:1px;background:rgba(255,255,255,0.05);margin:4px 0}
.chat-area{display:none;flex-direction:column;gap:12px}
.chat-messages{max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}
.chat-messages::-webkit-scrollbar{width:4px}
.chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
.msg-bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.6;max-width:90%;white-space:pre-wrap;word-break:break-word}
.msg-bubble.user{background:#1a6bff;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.msg-bubble.bot{background:#222;border:1px solid rgba(255,255,255,0.07);align-self:flex-start;border-bottom-left-radius:4px}
.typing-dots{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#222;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start}
.typing-dots span{width:7px;height:7px;background:rgba(229,226,225,0.4);border-radius:50%;animation:blink 1.2s infinite}
.typing-dots span:nth-child(2){animation-delay:.15s}
.typing-dots span:nth-child(3){animation-delay:.3s}
@keyframes blink{0%,80%,100%{transform:scale(1);opacity:.4}40%{transform:scale(1.2);opacity:1}}
.chat-input-row{display:flex;gap:8px}
.chat-input-row input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:#111;color:#e5e2e1;font-size:13px;outline:none;transition:border-color .2s}
.chat-input-row input:focus{border-color:rgba(99,149,255,0.4)}
.send-btn{width:38px;height:38px;min-width:38px;border-radius:10px;border:none;background:#1a6bff;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;transition:all .15s}
.send-btn:hover{background:#2b7bff}
.send-btn:disabled{opacity:0.35;cursor:not-allowed}
.meta{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(229,226,225,0.3)}
</style>
</head><body>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
  <div style="font-size:32px">🧪</div>
  <div>
    <h1>MiniMax Key Tester</h1>
    <p class="sub" style="margin-bottom:0">Validate your API key instantly</p>
  </div>
</div>

<div class="card">
  <div class="logo">
    <div class="logo-icon">M</div>
    <div>
      <div style="font-weight:700;font-size:15px">MiniMax</div>
      <div style="font-size:11px;color:rgba(229,226,225,0.4)">api.minimaxi.chat</div>
    </div>
  </div>

  <div>
    <div class="label">API Key</div>
    <div class="input-wrap">
      <input id="keyInput" type="password" placeholder="eyJ... or your MiniMax API key" autocomplete="off">
      <button class="eye" onclick="toggleVis()" id="eyeBtn">👁</button>
    </div>
  </div>

  <button class="btn btn-test" id="testBtn" onclick="testKey()">🔑 Test API Key</button>

  <div class="result" id="result">
    <div class="result-title"><span class="result-icon" id="resultIcon"></span><span id="resultTitle"></span></div>
    <div class="result-body" id="resultBody"></div>
  </div>

  <div class="divider" id="chatDivider" style="display:none"></div>

  <div class="chat-area" id="chatArea">
    <div class="label">Quick Chat Demo</div>
    <div class="chat-messages" id="chatMsgs"></div>
    <div class="chat-input-row">
      <input id="chatInput" placeholder="Ask anything..." onkeydown="if(event.key==='Enter')sendChat()">
      <button class="send-btn" id="sendBtn" onclick="sendChat()" title="Send">➤</button>
    </div>
    <div class="meta">
      <span>Model: MiniMax-Text-01</span>
      <span id="usageInfo"></span>
    </div>
  </div>
</div>

<div style="margin-top:20px;font-size:11px;color:rgba(229,226,225,0.25);text-align:center;max-width:400px">
  Key is stored locally in your browser only.<br>Get your key at <span style="color:#1a6bff">platform.minimaxi.chat</span>
</div>

<script>
let API_KEY = localStorage.getItem('beaverkit_minimax_key') || '';
let totalTokens = 0;
const chatHistory = [];
if(API_KEY) document.getElementById('keyInput').value = API_KEY;

function toggleVis(){
  const i = document.getElementById('keyInput');
  const b = document.getElementById('eyeBtn');
  if(i.type==='password'){i.type='text';b.textContent='🙈';}
  else{i.type='password';b.textContent='👁';}
}

async function testKey(){
  const key = document.getElementById('keyInput').value.trim();
  if(!key){showResult('err','❌','No Key Entered','Please paste your MiniMax API key above.');return;}
  API_KEY = key;
  localStorage.setItem('beaverkit_minimax_key', key);
  const btn = document.getElementById('testBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Testing...';
  showResult('testing','⏳','Testing...','Sending a test request to MiniMax API...');
  try{
    const r = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:'MiniMax-Text-01',messages:[{role:'user',content:'Reply with exactly: OK'}],max_tokens:10})
    });
    const data = await r.json();
    if(!r.ok){
      const msg = data.base_resp?.status_msg || data.error?.message || ('HTTP '+r.status);
      showResult('err','❌','Invalid Key',msg);
    }else{
      const reply = data.choices?.[0]?.message?.content || '(no content)';
      const tokens = data.usage?.total_tokens || 0;
      showResult('ok','✅','API Key Valid!', 'Model: MiniMax-Text-01 ✓\\nTest reply: "'+reply+'"\\nTokens used: '+tokens);
      document.getElementById('chatDivider').style.display='block';
      document.getElementById('chatArea').style.display='flex';
    }
  }catch(e){
    showResult('err','⚠️','Network Error',e.message+'\\n\\nNote: CORS may block direct calls in some browsers. The key may still be valid — try using the BeaverKit AI Chat page.');
  }
  btn.disabled = false;
  btn.textContent = '🔄 Test Again';
}

function showResult(type, icon, title, body){
  const r=document.getElementById('result');
  r.style.display='block';
  r.className='result '+type;
  document.getElementById('resultIcon').textContent=icon;
  document.getElementById('resultTitle').textContent=title;
  document.getElementById('resultBody').textContent=body;
}

async function sendChat(){
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text||!API_KEY)return;
  input.value='';
  chatHistory.push({role:'user',content:text});
  renderMessages();
  const msgs = document.getElementById('chatMsgs');
  const typing = document.createElement('div');
  typing.className='typing-dots';typing.id='typing';
  typing.innerHTML='<span></span><span></span><span></span>';
  msgs.appendChild(typing);msgs.scrollTop=msgs.scrollHeight;
  document.getElementById('sendBtn').disabled=true;
  try{
    const r = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({model:'MiniMax-Text-01',messages:[{role:'system',content:'You are a helpful assistant. Be concise.'},...chatHistory],temperature:0.7,max_tokens:1024})
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.base_resp?.status_msg||'API error');
    const reply = data.choices?.[0]?.message?.content||'No response';
    totalTokens += data.usage?.total_tokens||0;
    chatHistory.push({role:'assistant',content:reply});
    document.getElementById('usageInfo').textContent='Tokens: '+totalTokens;
  }catch(e){chatHistory.push({role:'assistant',content:'Error: '+e.message});}
  typing?.remove();
  document.getElementById('sendBtn').disabled=false;
  renderMessages();
}

function renderMessages(){
  const c=document.getElementById('chatMsgs');
  c.innerHTML=chatHistory.map(m=>\`<div class="msg-bubble \${m.role==='user'?'user':'bot'}">\${m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>\`).join('');
  c.scrollTop=c.scrollHeight;
}
</script></body></html>`
  },
    tags: 'AI, Chatbot, API',
    code: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BeaverBot AI Chat</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#131313;color:#E5E2E1;font-family:'Segoe UI',system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}
.header{padding:16px 20px;border-bottom:1px solid rgba(88,65,66,0.15);display:flex;align-items:center;gap:12px;background:rgba(19,19,19,0.9);backdrop-filter:blur(12px)}
.header .avatar{width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#FFB3B6,#EF616F);display:flex;align-items:center;justify-content:center;font-size:18px}
.header h1{font-size:16px;font-weight:700;letter-spacing:-0.02em}
.header .badge{font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(108,219,162,0.15);color:#6cdba2;font-weight:600}
.key-setup{padding:24px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.key-setup input{width:100%;max-width:380px;padding:12px 16px;border-radius:12px;border:1px solid rgba(88,65,66,0.2);background:#1C1B1B;color:#E5E2E1;font-size:14px;font-family:monospace;outline:none;transition:all 0.2s}
.key-setup input:focus{border-color:#FFB3B6;box-shadow:0 0 0 3px rgba(255,179,182,0.1)}
.key-setup button{padding:10px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,#FFB3B6,#EF616F);color:#40000c;font-weight:700;font-size:14px;cursor:pointer;transition:transform 0.15s}
.key-setup button:hover{transform:scale(1.03)}
.key-setup button:active{transform:scale(0.97)}
.messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:80%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;animation:fadeIn 0.3s}
.msg.user{align-self:flex-end;background:#FFB3B6;color:#40000c;border-bottom-right-radius:4px}
.msg.bot{align-self:flex-start;background:#1C1B1B;border:1px solid rgba(88,65,66,0.1);border-bottom-left-radius:4px}
.typing{align-self:flex-start;padding:12px 20px;background:#1C1B1B;border-radius:16px;border-bottom-left-radius:4px;display:flex;gap:4px}
.typing span{width:8px;height:8px;background:#FFB3B6;opacity:0.5;border-radius:50%;animation:bounce 1.2s infinite}
.typing span:nth-child(2){animation-delay:0.15s}
.typing span:nth-child(3){animation-delay:0.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.input-area{padding:12px 16px;border-top:1px solid rgba(88,65,66,0.1)}
.input-wrap{display:flex;gap:8px;background:#1C1B1B;border:1px solid rgba(88,65,66,0.15);border-radius:14px;padding:6px;align-items:flex-end;transition:all 0.2s}
.input-wrap:focus-within{border-color:rgba(255,179,182,0.3)}
.input-wrap textarea{flex:1;background:transparent;border:none;color:#E5E2E1;font-size:14px;resize:none;max-height:120px;padding:6px 8px;outline:none;font-family:inherit;line-height:1.5}
.input-wrap textarea::placeholder{color:rgba(229,226,225,0.3)}
.send-btn{width:36px;height:36px;border-radius:10px;border:none;background:#FFB3B6;color:#40000c;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0}
.send-btn:hover{background:#f9a0a4}
.send-btn:disabled{opacity:0.3;cursor:not-allowed}
.send-btn svg{width:18px;height:18px}
.provider-tag{font-size:11px;color:rgba(229,226,225,0.4);text-align:center;padding:6px}
</style></head><body>
<div class="header">
  <div class="avatar">\u{1F916}</div>
  <div>
    <h1>BeaverBot Chat</h1>
    <div style="font-size:11px;color:rgba(229,226,225,0.4);margin-top:2px">AI-powered coding assistant</div>
  </div>
  <div class="badge" id="status">Offline</div>
</div>
<div id="app"></div>
<script>
const app=document.getElementById('app');
let API_KEY=localStorage.getItem('beaverkit_demo_gemini_key')||'';
let chatHistory=[];
function renderKeySetup(){
  app.innerHTML=\`<div class="key-setup">
    <div style="font-size:48px;opacity:0.2">\u{1F511}</div>
    <h2 style="font-size:18px;font-weight:600">Enter your Gemini API Key</h2>
    <p style="font-size:13px;color:rgba(229,226,225,0.5);max-width:360px">Your key is stored locally in your browser and never sent to our servers. Get one free at <span style="color:#FFB3B6">aistudio.google.com</span></p>
    <input id="keyInput" type="password" placeholder="AIza..." value="\${API_KEY}">
    <button onclick="saveKey()">Connect</button>
  </div>\`;
}
function saveKey(){
  const k=document.getElementById('keyInput').value.trim();
  if(!k)return;
  API_KEY=k;
  localStorage.setItem('beaverkit_demo_gemini_key',k);
  renderChat();
}
function renderChat(){
  document.getElementById('status').textContent='Connected';
  document.getElementById('status').style.background='rgba(108,219,162,0.15)';
  document.getElementById('status').style.color='#6cdba2';
  app.innerHTML=\`<div class="messages" id="msgs"></div>
    <div class="provider-tag">Powered by Gemini 2.0 Flash</div>
    <div class="input-area"><div class="input-wrap">
      <textarea id="input" rows="1" placeholder="Ask me about web dev..."
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}"></textarea>
      <button class="send-btn" id="sendBtn" onclick="send()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg></button>
    </div></div>\`;
  renderMessages();
}
function renderMessages(){
  const c=document.getElementById('msgs');
  if(!c)return;
  c.innerHTML=chatHistory.map(m=>\`<div class="msg \${m.role==='user'?'user':'bot'}">\${escapeHtml(m.content)}</div>\`).join('');
  c.scrollTop=c.scrollHeight;
}
function escapeHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
async function send(){
  const input=document.getElementById('input');
  const text=input.value.trim();
  if(!text)return;
  input.value='';input.style.height='auto';
  chatHistory.push({role:'user',content:text});
  renderMessages();
  const msgs=document.getElementById('msgs');
  msgs.innerHTML+=\`<div class="typing"><span></span><span></span><span></span></div>\`;
  msgs.scrollTop=msgs.scrollHeight;
  document.getElementById('sendBtn').disabled=true;
  try{
    const contents=chatHistory.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
    const r=await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${encodeURIComponent(API_KEY)}\`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents,systemInstruction:{parts:[{text:'You are BeaverBot, a creative coding assistant on the BeaverKit platform. Help users with HTML, CSS, JS, Canvas, animations, and creative web development. Be concise, friendly, and provide code examples when appropriate. Respond in the same language as the user.'}]},generationConfig:{temperature:0.7,maxOutputTokens:2048}})
    });
    if(!r.ok) throw new Error('API error '+r.status);
    const d=await r.json();
    const reply=d.candidates?.[0]?.content?.parts?.[0]?.text||'Sorry, no response.';
    chatHistory.push({role:'assistant',content:reply});
  }catch(e){chatHistory.push({role:'assistant',content:'\\u274c Error: '+e.message+'\\n\\nPlease check your API key.'})}
  document.getElementById('sendBtn').disabled=false;
  renderMessages();
}
if(API_KEY)renderChat();else renderKeySetup();
</script></body></html>`
  }
  ];

  for (const v of vibes) {
    const vibe = await db.get(
      'INSERT INTO vibes (title, author_id, tags) VALUES ($1, $2, $3) RETURNING id',
      [v.title, userId, v.tags]
    );
    await db.run(
      'INSERT INTO versions (vibe_id, version_number, code, update_log) VALUES ($1, $2, $3, $4)',
      [vibe.id, 1, v.code, 'Initial version']
    );
    console.log(`✅ Added: "${v.title}" (id=${vibe.id})`);
  }

  console.log('\n🎉 Cold start complete! 5 vibes added to Supabase.\n');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
