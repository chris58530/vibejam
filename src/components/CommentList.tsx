import React from 'react';
import { Comment } from '../lib/api';

interface CommentListProps {
  comments: Comment[];
  vibeAuthorId: number;
  timeAgo: (dateStr: string) => string;
}

export default function CommentList({ comments, vibeAuthorId, timeAgo }: CommentListProps) {
  return (
    <div className="space-y-5 min-h-[420px]">
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <span className="material-symbols-outlined text-[32px] text-on-surface/10">forum</span>
          <p className="text-xs text-on-surface/25">Be the first to comment</p>
        </div>
      ) : comments.map(comment => (
        <div key={comment.id} className={`flex gap-3 ${comment.optimistic ? 'opacity-50' : ''}`}>
          <img src={comment.author_avatar} className="w-8 h-8 rounded-full shrink-0 border border-outline-variant/10" alt="" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-semibold text-on-surface">@{comment.author_name}</span>
              {comment.author_id === vibeAuthorId && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/25 text-primary bg-primary/8 uppercase tracking-widest">Creator</span>
              )}
              {comment.optimistic
                ? <span className="text-[10px] text-on-surface/25 italic">Sending…</span>
                : <span className="text-[10px] text-on-surface/25">{timeAgo(comment.created_at)}</span>}
            </div>
            <p className="text-[13px] text-on-surface/75 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}