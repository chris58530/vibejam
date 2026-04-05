import React, { useState, useEffect } from 'react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  onSave: (data: { title: string; description: string; visibility: 'public' | 'unlisted' | 'private' }) => void;
  isPublishing?: boolean;
  hasPublished?: boolean;
}

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  title: initialTitle,
  description: initialDescription,
  visibility: initialVisibility,
  onSave,
  isPublishing,
  hasPublished
}: ProjectSettingsModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState(initialVisibility);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || '未命名專案');
      setDescription(initialDescription || '');
      setVisibility(initialVisibility || 'public');
    }
  }, [isOpen, initialTitle, initialDescription, initialVisibility]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#121212] w-full max-w-[500px] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-on-surface">{hasPublished ? '專案設定' : '發布專案'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white transition-colors text-xl mb-1">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <label className="flex flex-col gap-2.5">
            <span className="text-sm text-on-surface flex items-center gap-1">專案名稱 <span className="text-error text-xs">*</span></span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-transparent border border-white/20 rounded-xl px-4 py-3.5 text-sm text-on-surface focus:border-[#2665fd] focus:outline-none transition-colors"
              placeholder="未命名專案"
            />
          </label>

          <label className="flex flex-col gap-2.5">
            <span className="text-sm text-on-surface">專案描述</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-transparent border border-white/20 rounded-xl px-4 py-3.5 text-sm text-on-surface resize-none h-28 focus:border-[#2665fd] focus:outline-none transition-colors"
              placeholder="描述一下這個專案的用途、使用的技術..."
            />
            <span className="text-xs text-on-surface/50 mt-0.5">好的描述可以幫助其他人更快了解你的作品。</span>
          </label>

          <div className="flex flex-col gap-3.5">
            <span className="text-sm text-on-surface">可見度</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${visibility === 'public' ? 'border-[#2665fd] bg-[#2665fd]/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="font-semibold text-on-surface text-[15px]">公開</div>
                <span className="text-xs text-on-surface/50 leading-tight">所有人都可以檢視並複製此專案。</span>
              </button>
              
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${visibility === 'private' ? 'border-[#2665fd] bg-[#2665fd]/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="font-semibold text-on-surface text-[15px]">私人</div>
                <span className="text-xs text-on-surface/50 leading-tight">只有你自己可以檢視此專案。</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-on-surface/70 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave({ title, description, visibility })}
            disabled={!title.trim() || isPublishing}
            className="px-6 py-2.5 text-sm font-semibold bg-[#2665fd] hover:bg-[#2665fd]/90 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center min-w-[110px]"
          >
            {isPublishing ? '發布中...' : hasPublished ? '儲存變更' : '確認發布'}
          </button>
        </div>
      </div>
    </div>
  );
}

