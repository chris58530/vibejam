import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [vibeInfo, setVibeInfo] = useState<{ vibe_id: number; vibe_title: string; author_name: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<any>(undefined);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSupabaseUser(data.session?.user ?? null));
  }, []);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    api.resolveInviteLink(token).then((res) => {
      if (res.valid && res.vibe_id) {
        setVibeInfo({ vibe_id: res.vibe_id, vibe_title: res.vibe_title!, author_name: res.author_name! });
      } else {
        setInvalid(true);
      }
      setLoading(false);
    }).catch(() => { setInvalid(true); setLoading(false); });
  }, [token]);

  const handleAccept = async () => {
    if (!token || !supabaseUser?.id || !vibeInfo) return;
    setAccepting(true);
    try {
      const result = await api.acceptInviteLink(token, supabaseUser.id);
      setAccepted(true);
      // Navigate to the vibe after a short delay
      setTimeout(() => navigate(`/p/${result.vibe_id}`), 1500);
    } catch (err: any) {
      alert(err.message || '接受邀請失敗');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || supabaseUser === undefined) {
    return (
      <div className="md:ml-56 pt-20 flex items-center justify-center min-h-screen bg-surface text-on-surface/40 font-mono text-lg tracking-widest uppercase">
        Loading...
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="md:ml-56 pt-20 flex flex-col items-center justify-center min-h-screen bg-surface gap-6">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-error/60">link_off</span>
        </div>
        <div className="text-center">
          <h1 className="text-on-surface font-bold text-xl mb-2">無效的邀請連結</h1>
          <p className="text-on-surface/50 text-sm">此邀請連結無效或已被撤銷。</p>
        </div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold">
          返回首頁
        </button>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="md:ml-56 pt-20 flex flex-col items-center justify-center min-h-screen bg-surface gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-primary">check_circle</span>
        </div>
        <div className="text-center">
          <h1 className="text-on-surface font-bold text-xl mb-2">已成為協作者！</h1>
          <p className="text-on-surface/50 text-sm">正在前往作品頁面…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:ml-56 pt-20 flex flex-col items-center justify-center min-h-screen bg-surface gap-6">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px] text-primary">group_add</span>
      </div>
      <div className="text-center max-w-sm">
        <h1 className="text-on-surface font-bold text-xl mb-2">你收到了協作邀請</h1>
        <p className="text-on-surface/60 text-sm mb-1">
          <span className="font-bold text-on-surface">{vibeInfo?.author_name}</span> 邀請你協作：
        </p>
        <p className="text-primary font-bold text-base mb-6">「{vibeInfo?.vibe_title}」</p>

        {supabaseUser ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-primary-fixed transition-colors"
          >
            {accepting ? '處理中…' : '接受邀請'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-on-surface/40 text-xs font-mono">請先登入以接受邀請</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-surface-container-high text-on-surface rounded-lg text-sm font-bold"
            >
              前往登入
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
