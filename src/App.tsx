/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import IterationLab from './pages/IterationLab';
import { Vibe } from './lib/api';

type Page = 'home' | 'workspace' | 'lab';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedVibeId, setSelectedVibeId] = useState<number | null>(null);
  const [remixData, setRemixData] = useState<{ id: number; code: string; title: string } | undefined>();

  const handleNavigate = (page: Page) => {
    if (page !== 'workspace') setRemixData(undefined);
    setCurrentPage(page);
  };

  const handleSelectVibe = (id: number) => {
    setSelectedVibeId(id);
    setCurrentPage('lab');
  };

  const handleRemix = (vibe: Vibe, code: string) => {
    setRemixData({ id: vibe.id, code, title: vibe.title });
    setCurrentPage('workspace');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      <Navbar onNavigate={handleNavigate} />
      
      <main className="h-full">
        {currentPage === 'home' && (
          <Home onSelectVibe={handleSelectVibe} />
        )}
        
        {currentPage === 'workspace' && (
          <Workspace 
            onPublish={() => setCurrentPage('home')} 
            remixFrom={remixData}
          />
        )}
        
        {currentPage === 'lab' && selectedVibeId && (
          <IterationLab 
            vibeId={selectedVibeId} 
            onBack={() => setCurrentPage('home')}
            onRemix={handleRemix}
          />
        )}
      </main>

      {/* Global Styles for custom scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

