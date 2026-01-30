import { create } from 'zustand';

interface SidebarRightViewState {
  isMaximized: boolean;
  toggleMaximize: () => void;
  setMaximized: (value: boolean) => void;
}

export const useSidebarRightViewStore = create<SidebarRightViewState>(
  (set) => ({
    isMaximized: false,
    toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
    setMaximized: (value: boolean) => set({ isMaximized: value }),
  }),
);
