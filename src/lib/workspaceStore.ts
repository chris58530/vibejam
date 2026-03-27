import { create } from 'zustand';

interface WorkspaceStore {
  publishFn: (() => void) | null;
  isPublishing: boolean;
  setPublishFn: (fn: (() => void) | null) => void;
  setIsPublishing: (v: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  publishFn: null,
  isPublishing: false,
  setPublishFn: (fn) => set({ publishFn: fn }),
  setIsPublishing: (v) => set({ isPublishing: v }),
}));
