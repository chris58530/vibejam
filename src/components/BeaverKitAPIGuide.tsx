// BeaverKitAPIGuide.tsx
// 顯示給專案開發者的 BeaverKit API 使用說明

interface Props {
  compact?: boolean; // true = 用在空白預覽區；false = 用在獨立面板
}

// ── 語法高亮輔助 ──────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  // 簡易 token 上色：keyword / string / comment / function
  const tokens = tokenize(children);
  return (
    <pre className="bg-[#0a0a0a] border border-outline-variant/10 rounded-lg p-3 text-[11px] font-mono leading-relaxed overflow-x-auto">
      <code>
        {tokens.map((t, i) => (
          <span key={i} className={TOKEN_COLORS[t.type]}>{t.value}</span>
        ))}
      </code>
    </pre>
  );
}

type TokenType = 'keyword' | 'string' | 'comment' | 'fn' | 'num' | 'plain';
const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'text-[#c792ea]',  // purple
  string:  'text-[#c3e88d]',  // green
  comment: 'text-[#546e7a] italic',
  fn:      'text-[#82aaff]',  // blue
  num:     'text-[#f78c6c]',  // orange
  plain:   'text-[#e5e2e1]',
};

function tokenize(code: string): { type: TokenType; value: string }[] {
  const tokens: { type: TokenType; value: string }[] = [];
  let remaining = code;

  const rules: { type: TokenType; re: RegExp }[] = [
    { type: 'comment', re: /^\/\/[^\n]*/ },
    { type: 'string',  re: /^(['"`])(?:\\.|(?!\1)[^\\])*\1/ },
    { type: 'keyword', re: /^(?:await|async|const|let|var|function|return|if|else|new|typeof|null|undefined|true|false)\b/ },
    { type: 'fn',      re: /^(?:window\.BeaverKit\.\w+|fetch|console\.\w+)/ },
    { type: 'num',     re: /^\d+/ },
    { type: 'plain',   re: /^[^\n]+?(?=\/\/|['"`]|\bawait\b|\basync\b|\bconst\b|\blet\b|\bvar\b|\bfunction\b|\breturn\b|\bif\b|\belse\b|\bnew\b|\btypeof\b|\bnull\b|\bundefined\b|\btrue\b|\bfalse\b|window\.BeaverKit|\bfetch\b|\bconsole\.|$|\n)/ },
    { type: 'plain',   re: /^\n/ },
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const { type, re } of rules) {
      const m = remaining.match(re);
      if (m) {
        tokens.push({ type, value: m[0] });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: 'plain', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

// ── Section 元件 ──────────────────────────────────────────────────────
function Section({ icon, color, title, badge, children }: {
  icon: string; color: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <span className="text-sm font-bold text-on-surface">{title}</span>
        {badge && (
          <span className="ml-1 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-mono font-bold uppercase tracking-wider rounded-full border border-primary/20">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Param({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="font-mono text-[11px] text-[#82aaff] shrink-0">{name}</span>
      <span className="font-mono text-[10px] text-on-surface/30 shrink-0">{type}</span>
      <span className="text-[11px] text-on-surface/50 leading-tight">{desc}</span>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────────
export default function BeaverKitAPIGuide({ compact = false }: Props) {
  return (
    <div className={`w-full h-full overflow-y-auto bg-[#050505] text-on-surface ${compact ? 'p-6' : 'p-8'}`}>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>api</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-on-surface tracking-tight">BeaverKit API</h1>
            <p className="text-[10px] text-on-surface/40 font-mono uppercase tracking-widest">Developer Reference</p>
          </div>
          <div className="ml-auto px-2.5 py-1 bg-tertiary/10 border border-tertiary/20 rounded-full">
            <span className="text-[10px] font-mono text-tertiary font-bold">v1.0 · Auto-injected</span>
          </div>
        </div>
        <p className="text-xs text-on-surface/50 leading-relaxed mt-3 pl-0.5">
          平台自動將 <code className="bg-surface-container px-1.5 py-0.5 rounded text-primary font-mono">window.BeaverKit</code> 注入到每個專案的 iframe，
          無需任何 import 或外部 script — 直接在你的 HTML 裡 <code className="bg-surface-container px-1.5 py-0.5 rounded text-primary font-mono">await</code> 就能用。
        </p>
      </div>

      {/* Save */}
      <Section icon="save" color="bg-blue-500/15 text-blue-400" title="BeaverKit.save()" badge="async">
        <p className="text-[11px] text-on-surface/50 mb-3 leading-relaxed">
          將任意資料儲存至使用者的本機（localStorage），以 <code className="bg-surface-container px-1 rounded text-primary font-mono">key</code> 隔離，不同專案互不干擾。
        </p>
        <div className="mb-3">
          <Param name="key" type="string" desc="唯一識別字串，例如 'saveSlot1' 或 'userConfig'" />
          <Param name="data" type="any" desc="任何可 JSON 序列化的值（物件、陣列、數字…）" />
        </div>
        <Code>{`// 儲存玩家資料
await window.BeaverKit.save('player', {
  name: '勇者',
  level: 5,
  hp: 100,
  items: ['sword', 'potion']
});

// 儲存設定
await window.BeaverKit.save('settings', { theme: 'dark', lang: 'zh' });`}</Code>
      </Section>

      {/* Load */}
      <Section icon="folder_open" color="bg-yellow-500/15 text-yellow-400" title="BeaverKit.load()" badge="async">
        <p className="text-[11px] text-on-surface/50 mb-3 leading-relaxed">
          讀取先前 <code className="bg-surface-container px-1 rounded text-primary font-mono">save()</code> 存入的資料。若該 key 不存在則回傳 <code className="bg-surface-container px-1 rounded text-on-surface/60 font-mono">null</code>。
        </p>
        <div className="mb-3">
          <Param name="key" type="string" desc="與 save() 相同的識別字串" />
          <Param name="→ 回傳" type="any | null" desc="先前儲存的值，或 null（若不存在）" />
        </div>
        <Code>{`// 讀取玩家資料
const player = await window.BeaverKit.load('player');

if (player === null) {
  // 首次啟動，建立新存檔
  await window.BeaverKit.save('player', { name: '新手', level: 1 });
} else {
  console.log('歡迎回來，' + player.name);
}`}</Code>
      </Section>

      {/* getApiKey */}
      <Section icon="key" color="bg-primary/15 text-primary" title="BeaverKit.getApiKey()" badge="async">
        <p className="text-[11px] text-on-surface/50 mb-3 leading-relaxed">
          取得使用者在 Settings 頁面填入的 AI API 金鑰。金鑰存在使用者本機，不會透過伺服器傳遞。若使用者未填入則回傳 <code className="bg-surface-container px-1 rounded text-on-surface/60 font-mono">null</code>。
        </p>
        <div className="mb-3">
          <Param name="provider" type="'gemini' | 'openai' | 'minimax'" desc="AI 提供商名稱（小寫字串）" />
          <Param name="→ 回傳" type="string | null" desc="API 金鑰字串，或 null（未設定時）" />
        </div>
        <Code>{`// 取得金鑰並呼叫 Gemini
const apiKey = await window.BeaverKit.getApiKey('gemini');

if (!apiKey) {
  alert('請先至平台設定頁面填入 Gemini API Key');
  return;
}

const res = await fetch(
  \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: '你好！' }] }]
    })
  }
);
const json = await res.json();
console.log(json.candidates[0].content.parts[0].text);`}</Code>
      </Section>

      {/* 完整範例 */}
      <Section icon="code" color="bg-tertiary/15 text-tertiary" title="完整範例 — 帶 AI 的小遊戲存檔">
        <p className="text-[11px] text-on-surface/50 mb-3 leading-relaxed">
          整合存讀檔 + AI 金鑰的最小可執行範例，直接貼進 Workspace 即可測試。
        </p>
        <Code>{`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { background:#111; color:#eee; font-family:monospace; padding:24px; }
    button { background:#6750a4; color:#fff; border:none; padding:8px 16px;
             border-radius:8px; cursor:pointer; margin:4px; }
    #output { margin-top:16px; background:#0a0a0a; padding:12px;
              border-radius:8px; min-height:40px; white-space:pre-wrap; }
  </style>
</head>
<body>
  <h2>BeaverKit API 測試</h2>
  <button onclick="doSave()">💾 存檔</button>
  <button onclick="doLoad()">📂 讀取</button>
  <button onclick="askAI()">🤖 問 AI</button>
  <div id="output">點擊按鈕開始測試…</div>

  <script>
    const out = s => document.getElementById('output').textContent = s;

    async function doSave() {
      await window.BeaverKit.save('demo', { score: 42, ts: Date.now() });
      out('✅ 已儲存 score=42');
    }

    async function doLoad() {
      const d = await window.BeaverKit.load('demo');
      out(d ? '📂 讀取成功：' + JSON.stringify(d) : '⚠️ 無存檔');
    }

    async function askAI() {
      const key = await window.BeaverKit.getApiKey('gemini');
      if (!key) { out('❌ 請先至 Settings 填入 Gemini Key'); return; }
      out('🤖 呼叫 AI 中…');
      const res = await fetch(
        \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${key}\`,
        { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ contents:[{ parts:[{ text:'用一句話介紹你自己' }] }] }) }
      );
      const j = await res.json();
      out('🤖 ' + (j?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(j)));
    }
  </script>
</body>
</html>`}</Code>
      </Section>

      {/* 注意事項 */}
      <div className="border border-outline-variant/10 rounded-xl p-4 bg-surface-container/30 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-yellow-400 text-[16px]">info</span>
          <span className="text-[11px] font-bold text-on-surface/70 uppercase tracking-wider">注意事項</span>
        </div>
        <ul className="space-y-2">
          {[
            ['存檔位置', '資料存在 使用者的瀏覽器 localStorage，換裝置不同步。'],
            ['Key 隔離', '儲存 key 自動加上 userId 前綴，不同帳號資料完全隔離。'],
            ['金鑰安全', 'getApiKey() 直接讀取本機，不經過伺服器。使用者必須先在 Settings 頁面填入。'],
            ['不需 import', 'window.BeaverKit 由平台自動注入，任何模式（HTML/React/Vue）皆可用。'],
          ].map(([title, desc]) => (
            <li key={title} className="flex items-start gap-2 text-[11px]">
              <span className="text-primary shrink-0 mt-0.5">▸</span>
              <span><span className="text-on-surface/70 font-bold">{title}：</span>
              <span className="text-on-surface/40">{desc}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="h-8" />
    </div>
  );
}
