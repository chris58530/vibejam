import React from 'react';

export type CommentSortOrder = 'newest' | 'oldest';

interface CommentSortMenuProps {
  value: CommentSortOrder;
  open: boolean;
  onToggle: () => void;
  onChange: (value: CommentSortOrder) => void;
  onClose: () => void;
}

export default function CommentSortMenu({ value, open, onToggle, onChange, onClose }: CommentSortMenuProps) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="flex items-center gap-1 text-xs text-on-surface/45 hover:text-on-surface/75 transition-colors cursor-pointer">
        <span className="material-symbols-outlined text-[14px]">sort</span>
        Sort by {value === 'oldest' ? 'Oldest' : 'Newest'}
        <span className="material-symbols-outlined text-[13px]">expand_more</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={onClose} />
          <div className="absolute left-0 top-full mt-1 z-30 bg-surface-container-highest border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden min-w-[150px]">
            {(['oldest', 'newest'] as const).map(order => (
              <button
                key={order}
                onClick={() => onChange(order)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-container-high transition-colors cursor-pointer ${value === order ? 'text-primary' : 'text-on-surface/65'}`}
              >
                <span className="material-symbols-outlined text-[13px]">{order === 'oldest' ? 'arrow_downward' : 'arrow_upward'}</span>
                {order === 'oldest' ? 'Oldest first' : 'Newest first'}
                {value === order && <span className="ml-auto material-symbols-outlined text-[12px]">check</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}