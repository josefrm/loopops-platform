import { create } from 'zustand';

interface ChatViewState {
  isMaximized: boolean;
  toggleMaximize: () => void;
  setMaximized: (value: boolean) => void;
}

export const useChatViewStore = create<ChatViewState>((set) => ({
  isMaximized: false,
  toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
  setMaximized: (value: boolean) => set({ isMaximized: value }),
}));
