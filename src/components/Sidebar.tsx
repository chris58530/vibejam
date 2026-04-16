import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { User } from '../lib/api';
import { useI18n } from '../lib/i18n';


// ── 說明分類資料 ──────────────────────────────────────────────────────
const HELP_SECTIONS = [
  {
    id: 'start',
    icon: 'rocket_launch',
    title: '快速入門',
    color: '#FFB3B6',
    items: [
      { q: 'BeaverKit 是什麼？', a: '一個讓你發佈、探索、Remix 創意網頁作品的社群平台。每件作品稱為「Kit」，由 HTML/CSS/JS 組成，直接在瀏覽器裡跑。' },
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
      { q: '在作品程式碼裡存讀資料', a: '平台提供 window.BeaverKit.save(key, data) 和 window.BeaverKit.load(key) 兩個非同步 API，讓你的作品程式碼直接把遊戲進度、設定等 JSON 資料存進用戶瀏覽器，下次載入自動讀回。\n\n範例：\nawait window.BeaverKit.save(\'progress\', { score: 100 });\nconst data = await window.BeaverKit.load(\'progress\');' },
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
      { q: '怎麼用 AI 生成 Kit？', a: '在 AI Chat 打「幫我做一個 XX 的動畫效果，輸出完整 HTML 檔案」，把回答的程式碼貼進 Workspace 即可。' },
      { q: '在作品程式碼裡呼叫 AI', a: '你的作品可以用 window.BeaverKit.getApiKey(\'gemini\') 取得用戶在 Settings 設定的 API Key，再直接對 AI API 發送請求，不需要自己保管 Key。\n支援：gemini、openai、minimax。\n\n範例：\nconst key = await window.BeaverKit.getApiKey(\'gemini\');\nif (!key) alert(\'請先在 Settings 設定 Gemini Key\');' },
    ],
  },
  {
    id: 'remix',
    icon: 'fork_right',
    title: 'Remix 玩法',
    color: '#FFE4B3',
    items: [
      { q: '什麼是 Remix？', a: '找到喜歡的 Kit，點「Remix」進入 Remix Studio，在原始程式碼基礎上加以改造，發布後會顯示來源作者。' },
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
      { q: '如何互動？', a: '點 Kit 進入詳情頁，可以留言、回應貼文、查看原始碼，或直接 Fork Remix。' },
      { q: 'Tags 怎麼用？', a: '發布時加上 Tags（如 #animation #ui-design），讓其他人更容易找到你的作品。' },
    ],
  },
];

// ── Help Modal ────────────────────────────────────────────────────────
export function HelpModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState('start');
  const [openItem, setOpenItem] = useState<string | null>(null);

  const section = HELP_SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Left nav */}
        <div className="w-48 shrink-0 bg-surface-container-low border-r border-outline-variant/10 flex flex-col py-4 gap-1 px-2">
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
              <span className="text-[11px] uppercase tracking-widest font-bold text-on-surface">使用說明</span>
            </div>
            <p className="text-[10px] text-on-surface/30 mt-1 leading-relaxed">BeaverKit 玩法指南</p>
          </div>
          {HELP_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setOpenItem(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === s.id ? 'bg-surface-container-high text-on-surface' : 'text-on-surface/50 hover:bg-surface-container hover:text-on-surface/80'}`}
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
              <h2 className="text-[15px] font-bold text-on-surface">{section.title}</h2>
            </div>
            <button onClick={onClose} className="text-on-surface/30 hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* FAQ accordion */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-2">
            {section.items.map((item, idx) => {
              const key = `${activeSection}-${idx}`;
              const isOpen = openItem === key;
              return (
                <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${isOpen ? 'border-outline-variant/30 bg-surface-container' : 'border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/20'}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
                    onClick={() => setOpenItem(isOpen ? null : key)}
                  >
                    <span className="text-[13px] font-semibold text-on-surface">{item.q}</span>
                    <span className="material-symbols-outlined text-[16px] text-on-surface/40 shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <p className="text-[12px] text-on-surface/60 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-outline-variant/10 shrink-0">
            <p className="text-[10px] text-on-surface/25 text-center">點擊問題展開說明 · 點背景關閉</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  dbUser?: User;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ dbUser, isOpen = true, onToggle }: SidebarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const navItems = [
    { key: 'home', label: t('sidebar_home'), icon: 'home', path: '/' },
    { key: 'following', label: t('sidebar_following'), icon: 'subscriptions', path: '/?feed=following' },
    { key: 'workspace', label: t('sidebar_workspace'), icon: 'terminal', path: '/workspace' },
    { key: 'settings', label: t('sidebar_settings'), icon: 'settings', path: '/settings' },
  ];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavClick = (key: string, path: string | null) => {
    if (key === 'profile') {
      const username = currentUser?.user_metadata?.user_name || currentUser?.user_metadata?.name;
      if (username) navigate(`/@${username}`);
      return;
    }
    if (path) navigate(path);
  };

  const activeLibraryTab = location.pathname === '/library'
    ? new URLSearchParams(location.search).get('tab') ?? 'history'
    : null;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface-container-low flex flex-col pb-2 hidden md:flex z-50 border-r border-outline-variant/5 overflow-hidden transition-[width] duration-300 ease-out ${isOpen ? 'w-56' : 'w-16'}`}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center shrink-0 px-3 gap-3">
        <button
          onClick={onToggle}
          title={isOpen ? '收合側邊欄' : '展開側邊欄'}
          aria-label={isOpen ? '收合側邊欄' : '展開側邊欄'}
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-on-surface/50 hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        {isOpen ? (
          <div
            className="flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => navigate('/')}
          >
            <img src="/Icon.png" alt="BeaverKit" className="w-8 h-8 shrink-0" />
            <span className="text-lg font-bold tracking-tighter text-on-surface font-headline whitespace-nowrap">
              BeaverKit
            </span>
          </div>
        ) : (
          <img
            src="/Icon.png"
            alt="BeaverKit"
            className="w-8 h-8 shrink-0 cursor-pointer"
            onClick={() => navigate('/')}
          />
        )}
      </div>
      <div className={`h-px bg-outline-variant/10 shrink-0 mb-2 ${isOpen ? 'mx-3' : 'mx-2'}`} />

      <motion.div
        initial={{ x: -56, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <nav className="relative space-y-1 px-2">
          {navItems.map(({ key, label, icon, path }) => {
            const isActive =
              (key === 'following' && location.search.includes('feed=following')) ||
              (key === 'home' && location.pathname === '/' && !location.search) ||
              (key === 'workspace' && location.pathname.includes('/workspace')) ||
              (key === 'settings' && location.pathname === '/settings');

            return (
              <button
                key={key}
                onClick={() => handleNavClick(key, path)}
                className={`relative w-full flex items-center rounded-xl font-body font-medium text-sm cursor-pointer transition-colors duration-200 ${isOpen ? 'gap-3 px-3 py-2.5 justify-start' : 'justify-center px-2 py-2.5'} ${isActive
                    ? 'text-primary'
                    : 'text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high/40'
                  }`}
                title={label}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-surface-container-high rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className="relative material-symbols-outlined shrink-0 text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {icon}
                </span>
                {isOpen && <span className="relative whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        {isOpen && (
          <div className="mt-3">
            <div className="h-px bg-outline-variant/10 mx-4 mb-3" />
            <div className="px-5 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface/30 font-bold">{t('sidebar_your_library')}</span>
            </div>
            <nav className="relative space-y-0.5 px-2">
              {([
                { icon: 'history', label: t('sidebar_history'), tab: 'history' as const },
                { icon: 'playlist_play', label: t('sidebar_saved_vibes'), tab: 'saved' as const },
                { icon: 'thumb_up', label: t('sidebar_liked_code'), tab: 'liked' as const },
              ]).map(({ icon, label, tab }) => {
                const isActive = activeLibraryTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => navigate(`/library?tab=${tab}`)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-body font-medium ${isActive
                        ? 'text-primary'
                        : 'text-on-surface/60 hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-library-indicator"
                        className="absolute inset-0 bg-surface-container-high rounded-xl"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className="relative material-symbols-outlined text-[20px] shrink-0"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {icon}
                    </span>
                    <span className="relative whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <div className="flex-1" />

        {isOpen && (
          <div className="border-t border-outline-variant/10 pt-3 pb-1">
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 mb-1.5">
              <a href="#" className="text-[10px] text-on-surface/30 hover:text-primary transition-colors uppercase tracking-widest font-body">Terms</a>
              <a href="#" className="text-[10px] text-on-surface/30 hover:text-primary transition-colors uppercase tracking-widest font-body">Privacy</a>
              <a href="#" className="text-[10px] text-on-surface/30 hover:text-primary transition-colors uppercase tracking-widest font-body">About</a>
            </div>
            <p className="px-4 text-[10px] text-on-surface/15 font-body">© 2024 BEAVERKIT EDITORIAL</p>
          </div>
        )}

        <button
          onClick={() => setHelpOpen(true)}
          className={`shrink-0 flex items-center mx-2 mb-1 text-on-surface/40 hover:text-primary hover:bg-surface-container-high rounded-xl transition-colors ${isOpen ? 'gap-3 px-3 py-2.5 justify-start' : 'justify-center px-2 py-2.5'}`}
          title="使用說明"
        >
          <span className="material-symbols-outlined shrink-0 text-[22px]">help</span>
          {isOpen && <span className="whitespace-nowrap text-sm font-medium font-body">使用說明</span>}
        </button>
      </motion.div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </aside>
  );
}
