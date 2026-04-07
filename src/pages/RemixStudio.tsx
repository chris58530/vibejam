import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, User } from '../lib/api';
import { useAIKeyStore, AI_PROVIDER_MODELS } from '../lib/aiKeyStore';
import { chatWithAIStream, ChatMessage, AIServiceError } from '../lib/aiService';
import { extractCodeFromAIResponse, extractPartialCode, generatePreviewDoc } from '../lib/codeUtils';

type ChatProvider = 'gemini' | 'openai' | 'minimax';

const CHAT_PROVIDER_LABEL: Record<ChatProvider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    minimax: 'MiniMax',
};

interface RemixStudioProps {
    currentUser?: User;
}

interface RemixState {
    parentVibeId: number;
    code: string;
    title: string;
    authorName: string;
    versionNumber: number;
    parentVisibility?: 'public' | 'unlisted' | 'private';
}

export default function RemixStudio({ currentUser }: RemixStudioProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const remixFrom = location.state as RemixState | undefined;

    // If no remix state, redirect to home
    useEffect(() => {
        if (!remixFrom) navigate('/');
    }, [remixFrom, navigate]);

    const { keys, validated, initialized, initialize, getUsage, dailyLimits } = useAIKeyStore();

    // AI chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ChatProvider | ''>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Code editor refs & highlight
    const codeEditorRef = useRef<HTMLTextAreaElement>(null);
    const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
    const [codeEditorScrollTop, setCodeEditorScrollTop] = useState(0);

    // Chat smart auto-scroll
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const autoScrollEnabledRef = useRef(true);

    // Code & publish state
    const [code, setCode] = useState(remixFrom?.code || '');
    const [title, setTitle] = useState(remixFrom ? `Remix of ${remixFrom.title}` : '');
    const [isPublishing, setIsPublishing] = useState(false);

    // Visibility: follow parent rules
    const parentVisibility = remixFrom?.parentVisibility || 'public';
    const visibilityLocked = parentVisibility === 'private';
    const defaultVisibility: 'public' | 'unlisted' | 'private' =
        parentVisibility === 'private' ? 'private' :
        parentVisibility === 'unlisted' ? 'unlisted' : 'public';
    const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(defaultVisibility);

    useEffect(() => {
        if (!initialized) initialize();
    }, [initialized, initialize]);

    // Chat: scroll to bottom when messages update (only if auto-scroll enabled)
    useEffect(() => {
        if (!autoScrollEnabledRef.current) return;
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    // Code editor: scroll to bottom while AI is streaming
    useEffect(() => {
        if (!loading) return;
        const el = codeEditorRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [code, loading]);

    const activeChatProviders = (['gemini', 'openai', 'minimax'] as const).filter(
        p => !!keys[p] && !!validated[p]
    );

    useEffect(() => {
        if (initialized) {
            if (activeChatProviders.length === 0) {
                setSelectedProvider('');
                return;
            }
            if (!selectedProvider || !activeChatProviders.includes(selectedProvider as ChatProvider)) {
                setSelectedProvider(activeChatProviders[0]);
            }
        }
    }, [initialized, JSON.stringify(activeChatProviders)]);

    // Reset model to provider default when provider changes
    useEffect(() => {
        if (selectedProvider) {
            const models = AI_PROVIDER_MODELS[selectedProvider];
            setSelectedModel(models?.[0]?.id || '');
        }
    }, [selectedProvider]);

    const hasActiveProvider = !!selectedProvider;
    const todayUsage = selectedProvider ? getUsage(selectedProvider) : 0;
    const limit = selectedProvider ? (dailyLimits[selectedProvider] || 0) : 0;

    // Generate preview
    const previewDoc = useMemo(() => generatePreviewDoc(code), [code]);

    // Build system prompt with current code context
    const buildSystemPrompt = (): ChatMessage => ({
        role: 'system',
        content: `你是 BeaverBot，BeaverKit 平台的 AI 程式碼助理。使用者正在 remix 一個專案。

你的任務：
1. 根據使用者的指令修改程式碼
2. 回覆時必須包含**完整的修改後程式碼**，用 \`\`\`html（或 \`\`\`tsx / \`\`\`vue 視框架而定）包裹
3. 在程式碼區塊之前或之後，簡短說明你做了什麼修改
4. 不要只給部分程式碼或 diff，必須給出完整可執行的程式碼

以下是目前的完整程式碼：

\`\`\`
${code}
\`\`\`

請根據使用者的指示修改上述程式碼。使用繁體中文回答。`,
    });

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading || !selectedProvider) return;

        setError('');
        const userMsg: ChatMessage = { role: 'user', content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        // Add a placeholder assistant message that we'll fill in as chunks arrive
        const placeholderMsg: ChatMessage = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, placeholderMsg]);

        try {
            const recentMessages = newMessages.slice(-10);
            let accumulated = '';

            await chatWithAIStream(
                selectedProvider,
                [buildSystemPrompt(), ...recentMessages],
                (chunk, full) => {
                    accumulated = full;
                    // Live-update last message in chat
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'assistant', content: full };
                        return updated;
                    });
                    // Live-update code editor: try complete block first, then partial
                    const complete = extractCodeFromAIResponse(full);
                    if (complete) {
                        setCode(complete);
                        setHighlightedLine(complete.split('\n').length - 1);
                    } else {
                        const partial = extractPartialCode(full);
                        if (partial) {
                            setCode(partial);
                            setHighlightedLine(partial.split('\n').length - 1);
                        }
                    }
                },
                { maxTokens: 8192, model: selectedModel || undefined }
            );

            // Final pass: ensure we got the complete code block
            const finalCode = extractCodeFromAIResponse(accumulated);
            if (finalCode) setCode(finalCode);

        } catch (err) {
            // Remove empty placeholder on error
            setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev);
            if (err instanceof AIServiceError) {
                setError(err.message);
            } else {
                setError('發生未知錯誤，請稍後再試。');
            }
        } finally {
            setLoading(false);
            setHighlightedLine(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePublish = async () => {
        if (!title.trim() || !code || !remixFrom) return;
        setIsPublishing(true);
        try {
            const result = await api.createVibe({
                title: title.trim(),
                tags: '',
                code: previewDoc || code,
                author_id: currentUser?.id,
                parent_vibe_id: remixFrom.parentVibeId,
                parent_version_number: remixFrom.versionNumber,
                visibility,
            });
            if (currentUser) {
                navigate(`/p/${result.id}`);
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Failed to publish remix:', err);
            setError('發布失敗，請稍後再試。');
        } finally {
            setIsPublishing(false);
        }
    };

    const [mobileTab, setMobileTab] = useState<'code' | 'chat' | 'preview'>('code');

    if (!remixFrom) return null;

    return (
        <div className="md:ml-16 flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0f0f1a]">

            {/* ── Topbar ── */}
            <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b bg-[#13131f] border-[#2a2a4a]">
                {/* Left: Source info */}
                <div className="flex items-center gap-2 text-xs font-mono min-w-0 flex-1">
                    <span className="material-symbols-outlined text-[14px] text-[#818cf8] shrink-0">repeat</span>
                    <span className="text-[#6b7280] shrink-0">Remixing from</span>
                    <button
                        onClick={() => navigate(`/p/${remixFrom.parentVibeId}`)}
                        className="text-[#a5b4fc] font-bold truncate max-w-[160px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5] rounded"
                        aria-label={`View source vibe: ${remixFrom.title}`}
                    >
                        {remixFrom.title}
                    </button>
                    <span className="text-[#6b7280] shrink-0 truncate">by {remixFrom.authorName}</span>
                </div>

                {/* Center: Title input */}
                <div className="flex justify-center shrink-0">
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-[160px] md:w-[220px] lg:w-[280px] rounded-lg px-3 py-1.5 text-sm font-medium outline-none border focus:ring-2 focus:ring-[#4f46e5]/40 transition-shadow bg-[#1a1a2e] border-[#2a2a4a] text-[#e0e7ff] placeholder:text-[#6b7280]"
                        placeholder="Remix 標題"
                    />
                </div>

                {/* Right: Visibility + Publish */}
                <div className="flex items-center gap-2 shrink-0 flex-1 justify-end">
                    <select
                        value={visibility}
                        onChange={e => !visibilityLocked && setVisibility(e.target.value as 'public' | 'unlisted' | 'private')}
                        disabled={visibilityLocked}
                        aria-label="Visibility"
                        className="rounded-lg px-2 py-1.5 text-xs font-mono font-bold outline-none border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#1a1a2e] border-[#2a2a4a] text-[#a5b4fc] focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
                        title={visibilityLocked ? 'Remixes of private vibes must be private' : undefined}
                    >
                        <option value="public">🌐 Public</option>
                        <option value="unlisted">🔗 Unlisted</option>
                        <option value="private">🔒 Private</option>
                    </select>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || !title.trim() || !code}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-mono font-bold rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        <span className="material-symbols-outlined text-[16px]">publish</span>
                        {isPublishing ? '發布中...' : '發布 Remix'}
                    </button>
                </div>
            </div>

            {/* Mobile Tab Switcher — 3 tabs */}
            <div className="flex md:hidden border-b border-[#2a2a4a] bg-[#13131f] shrink-0">
                <button
                    onClick={() => setMobileTab('code')}
                    className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'code' ? 'border-b-2 border-[#4f46e5] text-[#818cf8] bg-[#1a1a2e]' : 'text-[#6b7280]'}`}
                >
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">code</span>
                    Code
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'chat' ? 'border-b-2 border-[#4f46e5] text-[#818cf8] bg-[#1a1a2e]' : 'text-[#6b7280]'}`}
                >
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">chat</span>
                    AI Chat
                </button>
                <button
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-3 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mobileTab === 'preview' ? 'border-b-2 border-[#4f46e5] text-[#818cf8] bg-[#1a1a2e]' : 'text-[#6b7280]'}`}
                >
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">preview</span>
                    Preview
                </button>
            </div>

            {/* ── Main Content Area ── */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                {/* ── Left Column: Code Editor (top) + AI Chat (bottom) ── */}
                <div className={`${mobileTab === 'preview' ? 'hidden' : 'flex'} md:flex w-full md:w-[48%] md:min-w-[280px] flex-col border-r border-[#2a2a4a] bg-[#0f0f1a]`}>
                    {/* ─ Code Editor Panel (top 3/5 on desktop) ─ */}
                    <div
                        className={`${mobileTab === 'chat' ? 'hidden md:flex' : 'flex'} flex-col overflow-hidden border-b border-[#2a2a4a]`}
                        style={{ flex: '3 3 0', minHeight: 0 }}
                    >
                        {/* Code editor header */}
                        <div className="px-4 py-2.5 border-b border-[#2a2a4a] bg-[#13131f] flex items-center gap-2 shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-[#818cf8]">code</span>
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#a5b4fc]">Code Editor</span>
                            <span className="ml-auto text-[10px] font-mono text-[#6b7280]">{code.length} chars</span>
                        </div>
                        {/* Code textarea with line highlight overlay */}
                        <div className="flex-1 relative overflow-hidden bg-[#13131f]">
                            {highlightedLine !== null && (
                                <div
                                    className="absolute left-0 right-0 pointer-events-none z-10 border-l-2 border-[#4f46e5] bg-[#4f46e5]/[0.08]"
                                    style={{
                                        top: Math.max(0, 16 + highlightedLine * 19.5 - codeEditorScrollTop),
                                        height: 20,
                                    }}
                                />
                            )}
                            <textarea
                                ref={codeEditorRef}
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                onScroll={e => setCodeEditorScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
                                className="absolute inset-0 w-full h-full bg-transparent text-[#e0e7ff] font-mono text-xs p-4 resize-none outline-none leading-relaxed custom-scrollbar"
                                style={{ tabSize: 2, whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto' }}
                                spellCheck={false}
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoComplete="off"
                                placeholder="// 程式碼在這裡..."
                            />
                        </div>
                    </div>

                    {/* ─ AI Chat Panel (bottom 2/5 on desktop) ─ */}
                    <div
                        className={`${mobileTab === 'code' ? 'hidden md:flex' : 'flex'} flex-col overflow-hidden`}
                        style={{ flex: '2 2 0', minHeight: 0 }}
                    >
                        {/* Provider + Model Selector */}
                        {activeChatProviders.length > 0 && (
                            <div className="px-4 py-2 border-b border-[#2a2a4a] bg-[#13131f] flex flex-wrap items-center gap-2 shrink-0">
                                {activeChatProviders.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedProvider(p)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${selectedProvider === p ? 'bg-[#4f46e5] text-white' : 'bg-[#1a1a2e] text-[#6b7280]'}`}
                                    >
                                        {CHAT_PROVIDER_LABEL[p]}
                                    </button>
                                ))}
                                {selectedProvider && AI_PROVIDER_MODELS[selectedProvider] && (
                                    <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[#2a2a4a] rounded-full pl-2 pr-1 py-0.5">
                                        <span className="material-symbols-outlined text-[12px] text-[#818cf8]">model_training</span>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="bg-transparent text-[10px] font-mono font-bold text-[#e0e7ff] focus:outline-none max-w-[120px]"
                                        >
                                            {AI_PROVIDER_MODELS[selectedProvider]!.map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {selectedProvider && limit > 0 && (
                                    <span className="ml-auto text-[10px] font-mono text-[#6b7280]">
                                        {todayUsage}/{limit}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Chat Messages */}
                        <div
                            ref={chatScrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                            style={{ minHeight: 0 }}
                            onScroll={e => {
                                const el = e.currentTarget;
                                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                                autoScrollEnabledRef.current = atBottom;
                            }}
                        >
                            {!hasActiveProvider && (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <span className="material-symbols-outlined text-4xl text-[#6b7280] mb-3">key</span>
                                    <p className="text-sm text-[#a5b4fc] mb-2">尚未設定 AI API Key</p>
                                    <p className="text-xs text-[#6b7280] mb-4">請先至設定頁面輸入至少一個 AI 服務的 API Key</p>
                                    <button
                                        onClick={() => navigate('/settings')}
                                        className="px-4 py-2 bg-[#4f46e5] text-white text-xs font-bold rounded-lg transition-opacity"
                                    >
                                        前往設定
                                    </button>
                                </div>
                            )}

                            {hasActiveProvider && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <span className="material-symbols-outlined text-5xl text-[#818cf8]/40 mb-4">auto_awesome</span>
                                    <p className="text-sm font-medium text-[#a5b4fc] mb-2">告訴 AI 你想要什麼修改</p>
                                    <p className="text-xs text-[#6b7280]">例如：「把背景改成漸層色」、「加一個按鈕」、「改成暗色主題」</p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-[#4f46e5] text-white rounded-br-[4px]'
                                        : 'bg-[#1a1a2e] text-[#e0e7ff] rounded-bl-[4px]'
                                    }`}>
                                        {msg.role === 'assistant' ? formatAssistantMessage(msg.content) : msg.content}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#1a1a2e] rounded-2xl rounded-bl-[4px] px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono thinking-shimmer-text text-[#818cf8]">thinking</span>
                                            <span className="flex items-end gap-[3px]">
                                                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#818cf8]/70" />
                                                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#818cf8]/70" />
                                                <span className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#818cf8]/70" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-error-container text-on-error-container text-xs rounded-lg px-3 py-2">
                                    {error}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {hasActiveProvider && (
                            <div className="p-3 border-t border-[#2a2a4a] bg-[#13131f] shrink-0">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        placeholder="描述你想要的修改..."
                                        className="flex-1 bg-[#1a1a2e] border border-[#2a2a4a] text-[#e0e7ff] text-sm rounded-xl px-4 py-3 resize-none outline-none transition-shadow placeholder:text-[#6b7280] focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
                                        style={{ maxHeight: '100px', overflowY: 'auto' }}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                                        }}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        className="w-9 h-9 bg-[#4f46e5] text-white rounded-xl flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Preview Panel ── */}
                <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-[#0f0f1a]`}>
                    {/* Preview iframe */}
                    <div className="flex-1 relative p-4 lg:p-8">
                        <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-[#2a2a4a] relative">
                            {previewDoc ? (
                                <iframe
                                    srcDoc={previewDoc}
                                    className="w-full h-full border-none absolute inset-0 bg-white"
                                    title="Remix Preview"
                                    sandbox="allow-scripts allow-same-origin allow-forms"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[#6b7280]">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-5xl mb-3 block">preview</span>
                                        <p className="text-sm font-mono">預覽區域</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ── Helper: Format assistant messages
// Hides all code blocks (complete or partial/streaming) — code is shown in the editor above
function formatAssistantMessage(content: string): React.ReactNode {
    // Split on complete code blocks first
    const parts = content.split(/(```[\s\S]*?```)/g);
    const nodes: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (/^```[\s\S]*```$/.test(part)) {
            // Complete code block — replace with pill
            nodes.push(
                <div key={i} className="my-2 bg-[#13131f] border border-[#2a2a4a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#818cf8]">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        程式碼已自動套用至編輯區
                    </div>
                </div>
            );
        } else {
            // Strip any partial / still-streaming opening fence and everything after it
            const stripped = part.replace(/```[\w]*\n?[\s\S]*$/, '').trimEnd();
            if (stripped) nodes.push(<span key={i}>{stripped}</span>);
        }
    }
    return <>{nodes}</>;
}
