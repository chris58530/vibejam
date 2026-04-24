import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  Plus,
  Check,
  Globe,
  Lock,
  Save,
  Rocket,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  tags: string;
  visibility: 'public' | 'private';
  coverImage?: string;
  onSave: (data: {
    title: string;
    description: string;
    tags: string;
    visibility: 'public' | 'private';
    coverImage?: string;
    password?: string;
  }) => void;
  onSaveLocal?: (data: {
    title: string;
    description: string;
    tags: string;
    visibility: 'public' | 'private';
    coverImage?: string;
    password?: string;
  }) => void;
  isPublishing?: boolean;
  hasPublished?: boolean;
}

const DEFAULT_TAGS = [
  'React',
  'Vue',
  'Tailwind',
  'TypeScript',
  'Landing Page',
  '儀表板',
  '動畫',
  '遊戲',
  '工具',
  'AI',
  '3D',
  '表單',
  '音樂',
  '圖表',
];

const MAX_TAGS = 5;
const DESC_LIMIT = 300;

function parseTags(input: string): string[] {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .split(/[,\s#]+/)
        .map(t => t.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_TAGS);
}

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  title: initialTitle,
  description: initialDescription,
  tags: initialTags,
  visibility: initialVisibility,
  coverImage: initialCoverImage,
  onSave,
  onSaveLocal,
  isPublishing,
  hasPublished,
}: ProjectSettingsModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialVisibility);
  const [coverImage, setCoverImage] = useState<string | undefined>(initialCoverImage);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || '未命名專案');
      setDescription(initialDescription || '');
      setTagList(parseTags(initialTags));
      setTagDraft('');
      setVisibility((initialVisibility === 'private' ? 'private' : 'public') as 'public' | 'private');
      setCoverImage(initialCoverImage);
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen, initialTitle, initialDescription, initialTags, initialVisibility, initialCoverImage]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const descOver = description.length > DESC_LIMIT;
  const canSubmit = title.trim().length > 0 && !descOver && !isPublishing;

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag) return;
    setTagList(prev => {
      if (prev.length >= MAX_TAGS) return prev;
      if (prev.some(t => t.toLowerCase() === tag.toLowerCase())) return prev;
      return [...prev, tag];
    });
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    setTagList(prev => prev.filter(t => t !== tag));
  };

  const toggleTag = (tag: string) => {
    setTagList(prev => {
      if (prev.some(t => t.toLowerCase() === tag.toLowerCase())) {
        return prev.filter(t => t.toLowerCase() !== tag.toLowerCase());
      }
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagDraft.trim()) addTag(tagDraft);
    } else if (e.key === 'Backspace' && !tagDraft && tagList.length > 0) {
      e.preventDefault();
      setTagList(prev => prev.slice(0, -1));
    }
  };

  const filteredSuggestions = useMemo(() => {
    const query = tagDraft.trim().toLowerCase();
    if (!query) return [] as string[];
    return DEFAULT_TAGS.filter(
      t =>
        t.toLowerCase().includes(query) &&
        !tagList.some(selected => selected.toLowerCase() === t.toLowerCase())
    ).slice(0, 6);
  }, [tagDraft, tagList]);

  const canCreateCustom = useMemo(() => {
    const query = tagDraft.trim();
    if (!query) return false;
    if (tagList.some(t => t.toLowerCase() === query.toLowerCase())) return false;
    if (DEFAULT_TAGS.some(t => t.toLowerCase() === query.toLowerCase())) return false;
    return true;
  }, [tagDraft, tagList]);

  const showDropdown = tagInputFocused && tagDraft.trim().length > 0;

  const handleImagePick = () => fileInputRef.current?.click();

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  };

  const quickPicks = DEFAULT_TAGS.slice(0, 8);

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    tags: tagList.join(' '),
    visibility,
    coverImage,
    password: visibility === 'private' ? password : undefined,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={hasPublished ? '專案設定' : '發布專案'}
    >
      <div
        className="bg-[#0c0c0e] w-full max-w-[640px] my-auto rounded-2xl border border-zinc-800/60 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 border-b border-zinc-800/60 bg-[#0c0c0e]/95 backdrop-blur-md">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-zinc-100">
              {hasPublished ? '專案設定' : '發布專案'}
            </h2>
            <p className="text-xs text-zinc-500">
              {hasPublished ? '調整專案資訊與可見度' : '分享你的作品，讓世界看見你的 Vibe'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto px-6 py-6 flex flex-col gap-7">
          {/* Cover Image */}
          <section className="flex flex-col gap-2.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              封面圖片
            </label>
            {coverImage ? (
              <div className="relative group rounded-xl overflow-hidden border border-zinc-800/60 aspect-video bg-zinc-900">
                <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button
                    type="button"
                    onClick={handleImagePick}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-sm transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    更換封面
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImage(undefined)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white text-xs font-medium backdrop-blur-sm transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    移除
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleImagePick}
                className="group relative flex flex-col items-center justify-center gap-2 aspect-video w-full rounded-xl border border-dashed border-zinc-700/60 hover:border-indigo-500/60 bg-zinc-900/30 hover:bg-indigo-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/80 group-hover:bg-indigo-500/20 transition-colors">
                  <ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-medium text-zinc-300">點擊上傳封面</span>
                  <span className="text-xs text-zinc-500">建議 16:9 · 最大 5MB</span>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>

          {/* Title */}
          <section className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              專案名稱 <span className="text-red-400 normal-case">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder="為你的作品取一個響亮的名字"
              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/70 focus:bg-zinc-900/70 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </section>

          {/* Description */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                專案描述
              </label>
              <span
                className={`text-[11px] tabular-nums ${descOver ? 'text-red-400 font-medium' : 'text-zinc-500'}`}
              >
                {description.length} / {DESC_LIMIT}
              </span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述一下這個專案的用途、使用的技術、靈感來源..."
              className={`w-full bg-zinc-900/40 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none h-24 focus:outline-none transition-all ${descOver
                  ? 'border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-zinc-800 focus:border-indigo-500/70 focus:bg-zinc-900/70 focus:ring-2 focus:ring-indigo-500/20'
                }`}
            />
            <span className="text-[11px] text-zinc-500">
              好的描述能讓別人更快找到並愛上你的作品。
            </span>
          </section>

          {/* Tags */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                標籤
              </label>
              <span className="text-[11px] tabular-nums text-zinc-500">
                {tagList.length} / {MAX_TAGS}
              </span>
            </div>

            <div className="relative">
              <div className="flex flex-wrap gap-2 items-center">
                {tagList.map(tag => (
                  <span
                    key={tag}
                    className="group flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`移除 ${tag}`}
                      className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-500/40 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </span>
                ))}

                {tagList.length < MAX_TAGS && (
                  <div
                    className={`flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full border border-dashed transition-all cursor-text ${tagInputFocused
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                        : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    onClick={() => tagInputRef.current?.focus()}
                  >
                    <Plus
                      className={`w-3 h-3 transition-colors ${tagInputFocused ? 'text-indigo-400' : 'text-zinc-500'
                        }`}
                      strokeWidth={2.5}
                    />
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagDraft}
                      onChange={e => setTagDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setTagInputFocused(true)}
                      onBlur={() => setTimeout(() => setTagInputFocused(false), 150)}
                      placeholder={tagList.length === 0 ? '新增標籤...' : '加一個'}
                      maxLength={20}
                      className="bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none w-24"
                    />
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && (filteredSuggestions.length > 0 || canCreateCustom) && (
                <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-zinc-800 bg-[#111114] shadow-xl overflow-hidden">
                  <div className="max-h-56 overflow-y-auto py-1">
                    {filteredSuggestions.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          addTag(tag);
                          tagInputRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-indigo-500/10 hover:text-indigo-200 transition-colors cursor-pointer text-left"
                      >
                        <span className="text-zinc-500">#</span>
                        {tag}
                      </button>
                    ))}
                    {canCreateCustom && (
                      <>
                        {filteredSuggestions.length > 0 && (
                          <div className="h-px bg-zinc-800 my-1" />
                        )}
                        <button
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            addTag(tagDraft);
                            tagInputRef.current?.focus();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-indigo-500/10 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <Plus className="w-3.5 h-3.5 text-indigo-400" strokeWidth={2.5} />
                          <span className="text-zinc-500">建立</span>
                          <span className="font-medium truncate">「{tagDraft.trim()}」</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick picks */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-500">推薦標籤</span>
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map(tag => {
                  const active = tagList.some(t => t.toLowerCase() === tag.toLowerCase());
                  const disabled = !active && tagList.length >= MAX_TAGS;
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${active
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                          : 'bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Visibility */}
          <section className="flex flex-col gap-2.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              隱私設定
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <VisibilityCard
                icon={<Globe className="w-4 h-4" />}
                title="公開專案"
                description="所有人都可瀏覽與 Remix"
                active={visibility === 'public'}
                onClick={() => setVisibility('public')}
              />
              <VisibilityCard
                icon={<Lock className="w-4 h-4" />}
                title="私人專案"
                description="僅你本人及知道密碼的人可檢視"
                active={visibility === 'private'}
                onClick={() => setVisibility('private')}
              />
            </div>

            {/* Password (private only) */}
            {visibility === 'private' && (
              <div className="flex flex-col gap-2 mt-3">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  密碼保護（選填）
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    maxLength={100}
                    placeholder="設定密碼（留空表示不設密碼）"
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">設定密碼後，知道連結的人輸入正確密碼才可查看。</p>
              </div>
            )}
          </section>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 py-4 border-t border-zinc-800/60 bg-[#0c0c0e]/95 backdrop-blur-md">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            取消
          </button>
          <div className="flex items-center gap-2">
            {onSaveLocal && (
              <button
                onClick={() => onSaveLocal(buildPayload())}
                disabled={!title.trim() || descOver}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                儲存草稿
              </button>
            )}
            <button
              onClick={() => onSave(buildPayload())}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_4px_20px_-4px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-w-[112px] justify-center"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  發布中...
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" />
                  {hasPublished ? '更新發布' : '發布專案'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VisibilityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function VisibilityCard({ icon, title, description, active, onClick }: VisibilityCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${active
          ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_8px_24px_-12px_rgba(99,102,241,0.4)]'
          : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
        }`}
    >
      {active && (
        <div className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white">
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <div
          className={`flex items-center gap-2 text-sm font-semibold ${active ? 'text-indigo-100' : 'text-zinc-200'
            }`}
        >
          <span className={active ? 'text-indigo-300' : 'text-zinc-500'}>{icon}</span>
          {title}
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
