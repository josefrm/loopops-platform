import { create } from 'zustand';

interface DocumentViewerState {
  isOpen: boolean;
  document: {
    title: string;
    content: string;
  } | null;
  openDocument: (title: string, content: string) => void;
  closeDocument: () => void;
}

export const useDocumentViewerStore = create<DocumentViewerState>((set) => ({
  isOpen: false,
  document: null,
  openDocument: (title: string, content: string) => 
    set({ isOpen: true, document: { title, content } }),
  closeDocument: () => 
    set({ isOpen: false }),
}));
