import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full flex flex-col sm:flex-row justify-between items-center px-8 py-5 bg-[#131313] border-t border-outline-variant/10 gap-3 mt-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#E5E2E1] font-sans">BeaverKit</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#E5E2E1]/30">© 2024</span>
      </div>
      <div className="flex gap-6">
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-[#E5E2E1]/35 hover:text-[#FFB3B6] transition-colors">Terms</a>
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-[#E5E2E1]/35 hover:text-[#FFB3B6] transition-colors">Privacy</a>
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-[#E5E2E1]/35 hover:text-[#FFB3B6] transition-colors">About</a>
      </div>
    </footer>
  );
}
