import { useState } from 'react';
import DebugOverlay from './DebugOverlay';

export default function AppDebugTools() {
  const [debugMode, setDebugMode] = useState(false);

  return (
    <>
      <button
        onClick={() => window.open('/qa-lab', '_blank')}
        title="開啟 QA 測試頁面"
        className="fixed bottom-20 right-[4.25rem] md:bottom-6 md:right-[5.5rem] z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 bg-surface-container-high text-on-surface/50 hover:text-purple-400 hover:bg-purple-500/10 hover:ring-2 hover:ring-purple-500/20"
      >
        <span className="material-symbols-outlined text-[20px]">science</span>
      </button>
      <button
        onClick={() => setDebugMode((enabled) => !enabled)}
        title={debugMode ? '關閉 Debug 模式' : '開啟 Debug 模式'}
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[199] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${debugMode
          ? 'bg-red-500 text-white ring-4 ring-red-500/30 scale-110'
          : 'bg-surface-container-high text-on-surface/50 hover:text-red-400 hover:bg-red-500/10 hover:ring-2 hover:ring-red-500/20'
          }`}
      >
        <span className="material-symbols-outlined text-[20px]">bug_report</span>
      </button>

      {debugMode && <DebugOverlay onClose={() => setDebugMode(false)} />}
    </>
  );
}