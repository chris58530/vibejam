import React from 'react';
import { User } from '../lib/api';

interface CommentComposerProps {
  currentUser?: User;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRequireAuth: () => void;
}

export default function CommentComposer({ currentUser, value, onChange, onSubmit, onRequireAuth }: CommentComposerProps) {
  if (!currentUser) {
    return (
      <button onClick={onRequireAuth} className="w-full flex items-center justify-center gap-2 px-3 py-3 mb-4 bg-surface-container-high/60 border border-outline-variant/15 rounded-xl text-on-surface/55 text-sm cursor-pointer hover:bg-surface-container-high transition-colors">
        <span className="material-symbols-outlined text-[15px]">login</span>
        登入後留言
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center pb-3 mb-3 border-b border-outline-variant/10">
      <img src={currentUser.avatar} className="w-7 h-7 rounded-full shrink-0" alt="" />
      <div className="flex-1 bg-surface-container-high rounded-xl px-3 py-1.5 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="留言這個 Vibe…"
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface/30 outline-none"
        />
        {value.trim() && (
          <button onClick={onSubmit} className="px-2.5 py-1 bg-primary text-on-primary text-xs font-semibold rounded-lg cursor-pointer hover:bg-primary/90 transition-colors shrink-0">
            送出
          </button>
        )}
      </div>
    </div>
  );
}