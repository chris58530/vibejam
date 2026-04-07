import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full flex flex-col sm:flex-row justify-between items-center px-8 py-5 bg-surface border-t border-outline-variant/10 gap-3 mt-auto">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-on-surface font-sans">BeaverKit</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/30">© 2024</span>
      </div>
      <div className="flex gap-6">
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/35 hover:text-primary transition-colors">Terms</a>
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/35 hover:text-primary transition-colors">Privacy</a>
        <a href="#" className="font-mono text-[9px] uppercase tracking-widest text-on-surface/35 hover:text-primary transition-colors">About</a>
      </div>
    </footer>
  );
}
