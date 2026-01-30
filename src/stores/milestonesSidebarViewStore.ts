import { create } from 'zustand';

interface MilestonesSidebarViewState {
  isMaximized: boolean;
  toggleMaximize: () => void;
  setMaximized: (value: boolean) => void;
}

export const useMilestonesSidebarViewStore = create<MilestonesSidebarViewState>(
  (set) => ({
    isMaximized: false, // Default to collapsed
    toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
    setMaximized: (value: boolean) => set({ isMaximized: value }),
  }),
);
