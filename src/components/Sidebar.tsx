import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '../lib/api';
import { EditorMode } from '../lib/codeUtils';

interface SaveSlot {
  id: string;
  title: string;
  tags: string;
  editorMode: EditorMode;
  code: { html: string; css: string; js: string };
  savedAt: string;
}

const navItems = [
  { label: 'Home', icon: 'home', path: '/' },
  { label: 'Trending', icon: 'trending_up', path: '/?feed=trending' },
  { label: 'Following', icon: 'subscriptions', path: '/?feed=following' },
  { label: 'Workspace', icon: 'terminal', path: '/workspace' },
  { label: 'AI Chat', icon: 'smart_toy', path: '/ai-chat' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
];

// ── 說明分類資料 ──────────────────────────────────────────────────────
const HELP_SECTIONS = [
  {
    id: 'start',
    icon: 'rocket_launch',
    title: '快速入門',
    color: '#FFB3B6',
    items: [
      { q: 'VibeJam 是什麼？', a: '一個讓你發佈、探索、Remix 創意網頁作品的社群平台。每件作品稱為「Vibe」，由 HTML/CSS/JS 組成，直接在瀏覽器裡跑。' },
      { q: '怎麼開始創作？', a: '點左側「Workspace」進入編輯器，貼上程式碼或自行撰寫，即時預覽後按「Publish」發布。' },
      { q: '需要登入嗎？', a: '瀏覽與預覽不需登入。發布作品、留言、Remix 則需要登入帳號。' },
    ],
  },
  {
    id: 'workspace',
    icon: 'terminal',
    title: 'Workspace 編輯器',
    color: '#B3D9FF',
    items: [
      { q: '四種編輯模式', a: '📋 直接貼上：貼整段 HTML 最快速；🔧 分開編輯：自訂 HTML/CSS/JS 三區；⚛️ React 元件：支援 JSX + Tailwind + Lucide；💚 Vue 元件：支援 Vue 3 SFC。' },
      { q: '貼上自動偵測', a: '貼上程式碼時系統會自動判斷框架類型，並靜默切換到對應模式，不需要手動選擇。' },
      { q: '視覺預覽', a: '右側是即時預覽，可切換桌面 / 手機版面。預覽在 sandbox iframe 中執行，安全隔離。' },
      { q: '發布作品', a: '填入標題和 Tags 後點「Publish」，作品會出現在你的個人頁面和首頁動態。' },
    ],
  },
  {
    id: 'saves',
    icon: 'folder',
    title: '存檔功能',
    color: '#B3FFD1',
    items: [
      { q: '存檔在哪裡？', a: '點左側 folder 圖示開啟存檔面板，最多可儲存 5 個專案。' },
      { q: '如何儲存？', a: '在 Workspace 開啟存檔面板，按「儲存目前專案」。若已有同名存檔則直接覆蓋更新。' },
      { q: '如何載入？', a: '在存檔面板點「載入」，會完整還原標題、Tags、模式和程式碼。' },
      { q: '存檔滿了怎辦？', a: '達到 5 個上限時請先刪除舊存檔（hover 顯示 ✕ 按鈕），才能新增。' },
      { q: '未登入能用嗎？', a: '可以，但存檔只保存在本機瀏覽器。換裝置或清除瀏覽器資料後會消失。' },
      { q: '在作品程式碼裡存讀資料', a: '平台提供 window.VibeJam.save(key, data) 和 window.VibeJam.load(key) 兩個非同步 API，讓你的作品程式碼直接把遊戲進度、設定等 JSON 資料存進用戶瀏覽器，下次載入自動讀回。\n\n範例：\nawait window.VibeJam.save(\'progress\', { score: 100 });\nconst data = await window.VibeJam.load(\'progress\');' },
    ],
  },
  {
    id: 'ai',
    icon: 'smart_toy',
    title: 'AI 助理',
    color: '#E8B3FF',
    items: [
      { q: '支援哪些 AI？', a: '支援 Gemini、OpenAI、MiniMax 三家。需要在 Settings 頁面輸入自己的 API Key 並驗證。' },
      { q: '有使用限制嗎？', a: '每個 provider 各有每日上限次數，可在 AI Chat 頁面看到剩餘額度。' },
      { q: '怎麼用 AI 生成 Vibe？', a: '在 AI Chat 打「幫我做一個 XX 的動畫效果，輸出完整 HTML 檔案」，把回答的程式碼貼進 Workspace 即可。' },
      { q: '在作品程式碼裡呼叫 AI', a: '你的作品可以用 window.VibeJam.getApiKey(\'gemini\') 取得用戶在 Settings 設定的 API Key，再直接對 AI API 發送請求，不需要自己保管 Key。\n支援：gemini、openai、minimax。\n\n範例：\nconst key = await window.VibeJam.getApiKey(\'gemini\');\nif (!key) alert(\'請先在 Settings 設定 Gemini Key\');' },
    ],
  },
  {
    id: 'remix',
    icon: 'fork_right',
    title: 'Remix 玩法',
    color: '#FFE4B3',
    items: [
      { q: '什麼是 Remix？', a: '找到喜歡的 Vibe，點「Remix」進入 Remix Studio，在原始程式碼基礎上加以改造，發布後會顯示來源作者。' },
      { q: 'Remix Studio 有什麼特別？', a: '左邊是原始版本，右邊是你的改造版本，可以即時對比差異後直接發布。' },
      { q: 'Remix 有版本記錄嗎？', a: '每次發布都會建立新 version，在作品頁面可以看到完整的版本歷史。' },
    ],
  },
  {
    id: 'explore',
    icon: 'explore',
    title: '探索與互動',
    color: '#B3F0FF',
    items: [
      { q: '首頁有哪些動態？', a: '全部：所有最新作品；Trending：按熱度排序；Following：只看你追蹤的人的作品。' },
      { q: '如何互動？', a: '點 Vibe 進入詳情頁，可以留言、回應貼文、查看原始碼，或直接 Fork Remix。' },
      { q: 'Tags 怎麼用？', a: '發布時加上 Tags（如 #animation #ui-design），讓其他人更容易找到你的作品。' },
    ],
  },
];

// ── Help Modal ────────────────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState('start');
  const [openItem, setOpenItem] = useState<string | null>(null);

  const section = HELP_SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#1C1B1B] border border-outline-variant/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Left nav */}
        <div className="w-48 shrink-0 bg-[#161616] border-r border-outline-variant/10 flex flex-col py-4 gap-1 px-2">
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FFB3B6] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#E5E2E1]">使用說明</span>
            </div>
            <p className="text-[10px] text-[#E5E2E1]/30 mt-1 leading-relaxed">VibeJam 玩法指南</p>
          </div>
          {HELP_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setOpenItem(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === s.id ? 'bg-[#2A2A2A] text-[#E5E2E1]' : 'text-[#E5E2E1]/50 hover:bg-[#222] hover:text-[#E5E2E1]/80'}`}
            >
              <span className="material-symbols-outlined text-[16px] shrink-0" style={{ color: activeSection === s.id ? s.color : undefined, fontVariationSettings: activeSection === s.id ? "'FILL' 1" : "'FILL' 0" }}>{s.icon}</span>
              <span className="text-[12px] font-medium">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: section.color + '18' }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: section.color, fontVariationSettings: "'FILL' 1" }}>{section.icon}</span>
              </div>
              <h2 className="text-[15px] font-bold text-[#E5E2E1]">{section.title}</h2>
            </div>
            <button onClick={onClose} className="text-[#E5E2E1]/30 hover:text-[#E5E2E1] transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* FAQ accordion */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-2">
            {section.items.map((item, idx) => {
              const key = `${activeSection}-${idx}`;
              const isOpen = openItem === key;
              return (
                <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${isOpen ? 'border-outline-variant/30 bg-[#222]' : 'border-outline-variant/10 bg-[#1E1E1E] hover:border-outline-variant/20'}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
                    onClick={() => setOpenItem(isOpen ? null : key)}
                  >
                    <span className="text-[13px] font-semibold text-[#E5E2E1]">{item.q}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#E5E2E1]/40 shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <p className="text-[12px] text-[#E5E2E1]/60 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-outline-variant/10 shrink-0">
            <p className="text-[10px] text-[#E5E2E1]/25 text-center">點擊問題展開說明 · 點背景關閉</p>
          </div>
        </div>
      </div>
    </div>
  );
}


interface SidebarProps {
  savePanelOpen?: boolean;
  onToggleSavePanel?: () => void;
  dbUser?: User;
}

export default function Sidebar({ savePanelOpen, onToggleSavePanel, dbUser }: SidebarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  const isWorkspace = location.pathname.includes('/workspace');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!dbUser?.id) return;
    try {
      const stored = localStorage.getItem(`vibejam_saves_${dbUser.id}`);
      if (stored) setSaves(JSON.parse(stored));
      else setSaves([]);
    } catch { setSaves([]); }
  }, [dbUser?.id]);

  const handleNavClick = (label: string, path: string | null) => {
    if (label === 'Profile') {
      const username = currentUser?.user_metadata?.user_name || currentUser?.user_metadata?.name;
      if (username) {
        navigate(`/@${username}`);
      }
      return;
    }
    if (path) navigate(path);
  };

  // If in workspace, render the minimal utility strip
  if (isWorkspace) {
    return (
      <>
        <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-16 bg-[#1C1B1B] flex flex-col items-center py-4 gap-6 border-r border-outline-variant/10 z-40 hidden md:flex">
          <button onClick={() => navigate('/')} className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="Home">
            <span className="material-symbols-outlined">home</span>
          </button>
          <button onClick={() => navigate('/workspace')} className="text-[#FFB3B6] bg-[#2A2A2A] p-2.5 rounded-xl transition-all duration-300" title="Workspace">
            <span className="material-symbols-outlined">workspace_premium</span>
          </button>
          <button
            onClick={onToggleSavePanel}
            className={`p-2.5 rounded-xl transition-all duration-300 ${savePanelOpen ? 'text-[#FFB3B6] bg-[#2A2A2A]' : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'}`}
            title="存檔區"
          >
            <span className="material-symbols-outlined" style={savePanelOpen ? { fontVariationSettings: "'FILL' 1" } : {}}>folder</span>
          </button>
          <button className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="Search">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] p-2.5 rounded-xl transition-all duration-300" title="History">
            <span className="material-symbols-outlined">history</span>
          </button>

          <div className="mt-auto flex flex-col gap-6 items-center">
            <button onClick={() => setHelpOpen(true)} className="text-[#E5E2E1]/70 hover:text-[#FFB3B6] transition-colors" title="使用說明">
              <span className="material-symbols-outlined">help</span>
            </button>
            {currentUser && (
              <div
                className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/30 cursor-pointer"
                onClick={() => handleNavClick('Profile', null)}
              >
                <img
                  src={currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`}
                  alt="User Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </aside>
        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      </>
    );
  }

  // Regular Sidebar — collapsed by default, expands on hover
  return (
    <aside className="group/sidebar fixed left-0 top-16 h-[calc(100vh-64px)] w-16 hover:w-64 bg-[#1C1B1B] flex flex-col pt-3 pb-2 hidden md:flex z-40 border-r border-outline-variant/5 transition-[width] duration-300 overflow-hidden">
      <nav className="space-y-1 px-2">
        {navItems.map(({ label, icon, path }) => {
          const isActive =
            (label === 'Trending' && location.search.includes('feed=trending')) ||
            (label === 'Following' && location.search.includes('feed=following')) ||
            (label === 'Home' && location.pathname === '/' && !location.search) ||
            (label === 'Workspace' && location.pathname === '/workspace') ||
            (label === 'AI Chat' && location.pathname === '/ai-chat') ||
            (label === 'Settings' && location.pathname === '/settings');

          return (
            <button
              key={label}
              onClick={() => handleNavClick(label, path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 font-body font-medium text-sm cursor-pointer ${isActive
                  ? 'text-[#FFB3B6] bg-[#2A2A2A]'
                  : 'text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1]'
                }`}
              title={label}
            >
              <span className="material-symbols-outlined shrink-0 text-[22px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover/sidebar:max-w-[160px] transition-[max-width] duration-300 opacity-0 group-hover/sidebar:opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Divider + Library — only visible when expanded */}
      <div className="overflow-hidden max-h-0 group-hover/sidebar:max-h-[320px] transition-[max-height] duration-300">
        <div className="my-3 h-px bg-[#584142]/10 mx-4"></div>
        <div className="px-5 mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#E5E2E1]/30 font-bold whitespace-nowrap">Your Library</span>
        </div>
        <nav className="space-y-0.5 px-2">
          {[
            { icon: 'history', label: 'History' },
            { icon: 'playlist_play', label: 'Saved Vibes' },
            { icon: 'thumb_up', label: 'Liked Code' },
          ].map(({ icon, label }) => (
            <button key={label} onClick={() => alert('機能建構中 (WIP)')} className="w-full flex items-center gap-3 px-3 py-2 text-[#E5E2E1]/70 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-sm font-body whitespace-nowrap">
              <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* My Saves */}
        {dbUser && (
          <div className="mt-2 px-2">
            <button
              onClick={() => {
                if (dbUser?.username) navigate(`/@${dbUser.username}?tab=saves`);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors group/saves"
            >
              <span className="material-symbols-outlined text-[14px] text-[#FFB3B6] group-hover/saves:text-[#FFB3B6]" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#E5E2E1]/40 group-hover/saves:text-[#E5E2E1]/70 font-bold whitespace-nowrap flex-1 transition-colors">My Saves</span>
              <span className={`text-[9px] font-mono tabular-nums ${saves.length >= 5 ? 'text-red-400/70' : 'text-[#E5E2E1]/25'}`}>{saves.length}/5</span>
              <span className="material-symbols-outlined text-[12px] text-[#E5E2E1]/20 group-hover/saves:text-[#E5E2E1]/50 transition-colors">chevron_right</span>
            </button>
            {saves.length === 0 ? (
              <p className="text-[10px] text-[#E5E2E1]/20 px-3 py-1 font-body whitespace-nowrap">尚無存檔</p>
            ) : (
              <div className="space-y-0.5">
                {saves.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      sessionStorage.setItem('vibejam_pending_load', JSON.stringify(slot));
                      navigate('/workspace');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[#E5E2E1]/60 hover:bg-[#2A2A2A] hover:text-[#E5E2E1] rounded-lg transition-colors text-left"
                    title={slot.title}
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#E5E2E1]/25 shrink-0">draft</span>
                    <span className="text-[11px] font-body whitespace-nowrap overflow-hidden text-ellipsis flex-1">{slot.title}</span>
                    <span className="text-[9px] font-mono text-[#E5E2E1]/20 shrink-0">
                      {new Date(slot.savedAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — only visible when expanded */}
      <div className="mt-auto overflow-hidden max-h-0 group-hover/sidebar:max-h-24 transition-[max-height] duration-300 border-t border-outline-variant/10">
        <div className="pt-3 space-y-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-4">
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Terms</a>
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">Privacy</a>
            <a href="#" className="text-[10px] text-[#E5E2E1]/40 hover:text-primary transition-colors uppercase tracking-widest font-body">About</a>
          </div>
          <div className="px-4 pb-2">
            <p className="text-[10px] text-[#E5E2E1]/20 font-medium font-body whitespace-nowrap">© 2024 VIBEJAM EDITORIAL</p>
          </div>
        </div>
      </div>

      {/* User avatar — always visible at bottom */}
      {currentUser && (
        <div className="flex items-center gap-3 px-3 py-2 mt-1 shrink-0">
          <div
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/30 cursor-pointer shrink-0"
            onClick={() => handleNavClick('Profile', null)}
          >
            <img
              src={currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`}
              alt="User Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover/sidebar:max-w-[140px] transition-[max-width] duration-300 text-xs text-[#E5E2E1]/60 font-body opacity-0 group-hover/sidebar:opacity-100">
            {currentUser.user_metadata?.user_name || currentUser.user_metadata?.name || ''}
          </span>
        </div>
      )}

      {/* Help button — always visible at bottom */}
      <button
        onClick={() => setHelpOpen(true)}
        className="shrink-0 flex items-center gap-3 px-3 py-2.5 text-[#E5E2E1]/40 hover:text-[#FFB3B6] hover:bg-[#2A2A2A] rounded-xl transition-colors"
        title="使用說明"
      >
        <span className="material-symbols-outlined shrink-0 text-[22px]">help</span>
        <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover/sidebar:max-w-[160px] transition-[max-width] duration-300 text-sm font-medium opacity-0 group-hover/sidebar:opacity-100">
          使用說明
        </span>
      </button>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </aside>
  );
}

