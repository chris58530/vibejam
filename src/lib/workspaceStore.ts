import { create } from 'zustand';

interface WorkspaceStore {
  publishFn: (() => void) | null;
  isPublishing: boolean;
  saveStatus: 'saved' | 'unsaved' | 'saving';
  setPublishFn: (fn: (() => void) | null) => void;
  setIsPublishing: (v: boolean) => void;
  setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  publishFn: null,
  isPublishing: false,
  saveStatus: 'saved',
  setPublishFn: (fn) => set({ publishFn: fn }),
  setIsPublishing: (v) => set({ isPublishing: v }),
  setSaveStatus: (s) => set({ saveStatus: s }),
}));
