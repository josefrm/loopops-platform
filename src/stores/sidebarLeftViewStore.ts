import { create } from 'zustand';

interface SidebarLeftViewState {
  isMaximized: boolean;
  toggleMaximize: () => void;
  setMaximized: (value: boolean) => void;
}

export const useSidebarLeftViewStore = create<SidebarLeftViewState>((set) => ({
  isMaximized: false,
  toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
  setMaximized: (value: boolean) => set({ isMaximized: value }),
}));
