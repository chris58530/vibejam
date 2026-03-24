import React from 'react';

export default function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row justify-between items-center px-8 py-10 bg-[#131313] border-t border-outline-variant/10 gap-4">
      <div className="flex flex-col gap-1 items-center sm:items-start">
        <span className="text-sm font-bold text-[#E5E2E1] font-sans">VibeJam</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40">© 2024 VibeJam Editorial</p>
      </div>
      <div className="flex gap-8">
        <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 hover:text-[#FFB3B6] transition-colors">Terms</a>
        <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 hover:text-[#FFB3B6] transition-colors">Privacy</a>
        <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-[#E5E2E1]/40 hover:text-[#FFB3B6] transition-colors">About</a>
      </div>
    </footer>
  );
}
