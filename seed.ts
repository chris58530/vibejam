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

  let user = await db.get('SELECT id FROM users WHERE username = $1', ['VibeBot']);
  if (!user) {
    user = await db.get(
      'INSERT INTO users (username, avatar) VALUES ($1, $2) RETURNING id',
      ['VibeBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=VibeBot']
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
