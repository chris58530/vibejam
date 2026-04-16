import React, { useState } from 'react';
import { Comment, User } from '../lib/api';
import CommentComposer from './CommentComposer';
import CommentList from './CommentList';
import CommentSortMenu, { CommentSortOrder } from './CommentSortMenu';

interface VibeCommentsProps {
  currentUser?: User;
  comments: Comment[];
  commentCount: number;
  vibeAuthorId: number;
  onAddComment: (content: string) => Promise<void>;
  onRequireAuth: () => void;
  timeAgo: (dateStr: string) => string;
}

export default function VibeComments({
  currentUser,
  comments,
  commentCount,
  vibeAuthorId,
  onAddComment,
  onRequireAuth,
  timeAgo,
}: VibeCommentsProps) {
  const [commentText, setCommentText] = useState('');
  const [sortOrder, setSortOrder] = useState<CommentSortOrder>('oldest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortedComments = [...comments].sort((a, b) =>
    sortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleSubmit = async () => {
    const content = commentText.trim();
    if (!content) return;
    setCommentText('');
    try {
      await onAddComment(content);
    } catch {
      // Preserve current behavior: keep the cleared input even if the request fails.
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-on-surface">
          {commentCount} Comment{commentCount !== 1 ? 's' : ''}
        </h3>
        <CommentSortMenu
          value={sortOrder}
          open={showSortDropdown}
          onToggle={() => setShowSortDropdown(value => !value)}
          onClose={() => setShowSortDropdown(false)}
          onChange={value => {
            setSortOrder(value);
            setShowSortDropdown(false);
          }}
        />
      </div>

      <CommentComposer
        currentUser={currentUser}
        value={commentText}
        onChange={setCommentText}
        onSubmit={handleSubmit}
        onRequireAuth={onRequireAuth}
      />

      <CommentList comments={sortedComments} vibeAuthorId={vibeAuthorId} timeAgo={timeAgo} />
    </div>
  );
}