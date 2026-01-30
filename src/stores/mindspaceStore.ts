/**
 * Mindspace Store v2
 *
 * Centralized state management for Mindspace documents.
 * Uses Zustand with best practices to avoid infinite loops:
 * - Use individual selectors to subscribe to specific state
 * - Actions are stable function references
 * - No persistence initially for simpler debugging
 */

import { supabase } from '@/integrations/supabase/client';
import {
  GetMindspaceFilesResponse,
  MindspaceDocument,
  mindspaceFileToDocument,
} from '@/models/MindspaceDocument';
import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export interface MindspaceCategory {
  id: number;
  name: string;
  priority?: number;
}

interface MindspaceState {
  // Documents
  documents: MindspaceDocument[];
  documentsLoading: boolean;
  documentsError: string | null;

  // Categories
  categories: MindspaceCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;

  // Selection (for bulk operations)
  selectedFileIds: string[];

  // Fetch tracking to prevent duplicate requests
  lastFetchKey: string | null;
}

interface MindspaceActions {
  // Document actions
  fetchDocuments: (workspaceId: string, projectId: string) => Promise<void>;
  addDocument: (doc: MindspaceDocument) => void;
  updateDocument: (id: string, updates: Partial<MindspaceDocument>) => void;
  removeDocument: (id: string) => void;
  setDocuments: (docs: MindspaceDocument[]) => void;

  // Category actions
  fetchCategories: () => Promise<void>;
  createCategory: (name: string) => Promise<boolean>;
  updateFileCategory: (
    fileIds: (string | number)[],
    categoryId: number,
  ) => Promise<boolean>;
  getTabCategoryId: (tabName: string) => number;
  getCategoryTabName: (categoryId: number) => string;

  // Selection actions
  setSelectedFileIds: (ids: string[]) => void;
  clearSelectedFileIds: () => void;
  toggleFileSelection: (id: string) => void;

  // Reset
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: MindspaceState = {
  documents: [],
  documentsLoading: false,
  documentsError: null,
  categories: [{ id: 1, name: 'All', priority: 1 }],
  categoriesLoading: false,
  categoriesError: null,
  selectedFileIds: [],
  lastFetchKey: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useMindspaceStore = create<MindspaceState & MindspaceActions>()(
  (set, get) => ({
    ...initialState,

    // =========================================================================
    // DOCUMENT ACTIONS
    // =========================================================================

    fetchDocuments: async (workspaceId: string, projectId: string) => {
      // Create a key to track this specific fetch
      const fetchKey = `${workspaceId}-${projectId}`;

      // Skip if already loading the same data
      if (get().documentsLoading && get().lastFetchKey === fetchKey) {
        console.log('[mindspaceStore] Skipping duplicate fetch for:', fetchKey);
        return;
      }

      set({
        documentsLoading: true,
        documentsError: null,
        lastFetchKey: fetchKey,
      });

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log('[mindspaceStore] No session found, skipping fetch');
          set({ documentsLoading: false });
          return;
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/get-mindspace-files`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workspace_id: workspaceId,
              project_id: projectId,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch documents');
        }

        const data: GetMindspaceFilesResponse = await response.json();
        const documents = data.files.map(mindspaceFileToDocument);

        // Sort by createdAt descending (newest first)
        documents.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        set({
          documents,
          documentsLoading: false,
          documentsError: null,
        });
      } catch (error) {
        console.error('[mindspaceStore] Error fetching documents:', error);
        set({
          documentsLoading: false,
          documentsError:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    addDocument: (doc: MindspaceDocument) => {
      set((state) => ({
        documents: [doc, ...state.documents],
      }));
    },

    updateDocument: (id: string, updates: Partial<MindspaceDocument>) => {
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates } : doc,
        ),
      }));
    },

    removeDocument: (id: string) => {
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        // Also remove from selection if selected
        selectedFileIds: state.selectedFileIds.filter((fid) => fid !== id),
      }));
    },

    setDocuments: (docs: MindspaceDocument[]) => {
      set({ documents: docs });
    },

    // =========================================================================
    // CATEGORY ACTIONS
    // =========================================================================

    fetchCategories: async () => {
      // Skip if already loading
      if (get().categoriesLoading) {
        console.log('[mindspaceStore] Skipping duplicate categories fetch');
        return;
      }

      set({ categoriesLoading: true, categoriesError: null });

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log(
            '[mindspaceStore] No session found, skipping categories fetch',
          );
          set({ categoriesLoading: false });
          return;
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/get-mindspace-categories`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();

        if (data && data.categories) {
          // Ensure "All" is always present and first
          const fetchedCategories = data.categories.filter(
            (c: MindspaceCategory) => c.name !== 'All',
          );
          set({
            categories: [
              { id: 1, name: 'All', priority: 1 },
              ...fetchedCategories,
            ],
            categoriesLoading: false,
            categoriesError: null,
          });
        }
      } catch (error) {
        console.error('[mindspaceStore] Error fetching categories:', error);
        set({
          categoriesLoading: false,
          categoriesError:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    createCategory: async (name: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/create-mindspace-category`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to create category');
        }

        const data = await response.json();

        if (data && data.categories) {
          const fetchedCategories = data.categories.filter(
            (c: MindspaceCategory) => c.name !== 'All',
          );
          set({
            categories: [
              { id: 1, name: 'All', priority: 1 },
              ...fetchedCategories,
            ],
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('[mindspaceStore] Error creating category:', error);
        return false;
      }
    },

    updateFileCategory: async (
      fileIds: (string | number)[],
      categoryId: number,
    ) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No active session');
        }

        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/move-mindspace-files`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileIds, categoryId }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to update file category');
        }

        return true;
      } catch (error) {
        console.error('[mindspaceStore] Error updating file category:', error);
        return false;
      }
    },

    getTabCategoryId: (tabName: string) => {
      const category = get().categories.find((c) => c.name === tabName);
      return category ? category.id : 1;
    },

    getCategoryTabName: (categoryId: number) => {
      const category = get().categories.find((c) => c.id === categoryId);
      return category ? category.name : 'All';
    },

    // =========================================================================
    // SELECTION ACTIONS
    // =========================================================================

    setSelectedFileIds: (ids: string[]) => {
      set({ selectedFileIds: ids });
    },

    clearSelectedFileIds: () => {
      set({ selectedFileIds: [] });
    },

    toggleFileSelection: (id: string) => {
      set((state) => {
        const isSelected = state.selectedFileIds.includes(id);
        return {
          selectedFileIds: isSelected
            ? state.selectedFileIds.filter((fid) => fid !== id)
            : [...state.selectedFileIds, id],
        };
      });
    },

    // =========================================================================
    // RESET
    // =========================================================================

    reset: () => {
      set(initialState);
    },
  }),
);

// =============================================================================
// SELECTOR HELPERS
// =============================================================================

/**
 * Helper to get selected documents from the store
 * Usage: const selectedDocs = useSelectedDocuments();
 */
export const useSelectedDocuments = () => {
  const documents = useMindspaceStore((state) => state.documents);
  const selectedFileIds = useMindspaceStore((state) => state.selectedFileIds);

  return documents.filter((doc) => selectedFileIds.includes(doc.id));
};

/**
 * Helper to get the count of selected files
 * Returns a primitive to avoid re-render issues
 */
export const useSelectedFilesCount = () => {
  return useMindspaceStore((state) => state.selectedFileIds.length);
};
