/**
 * Deliverables Store
 *
 * Centralized state management for project deliverables.
 * Uses Zustand to manage deliverable files lifecycle.
 */

import { toast } from '@/hooks/use-toast';
import { ProjectStageService } from '@/services/ProjectStageService';
import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export interface DeliverableItem {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  keyDeliverable: boolean;
  file_size?: number;
  mime_type?: string;
  mimeType?: string;
  signed_url?: string;
  createdInEditor?: boolean;
  isDeliverable?: boolean;
}

interface DeliverablesState {
  // Deliverables
  items: DeliverableItem[];
  loading: boolean;
  error: string | null;

  // Fetch tracking to prevent duplicate requests
  lastFetchKey: string | null;
}

interface DeliverablesActions {
  // Fetch actions
  fetchDeliverables: (
    workspaceId: string,
    projectId: string,
    stageId: string,
  ) => Promise<void>;

  // Item actions
  addItem: (item: DeliverableItem) => void;
  updateItem: (id: string, updates: Partial<DeliverableItem>) => void;
  removeItem: (id: string) => void;
  setItems: (items: DeliverableItem[]) => void;

  // Toggle deliverable status
  toggleDeliverableStatus: (
    id: string,
  ) => Promise<{ success: boolean; newStatus: boolean }>;

  // Revert deliverable
  revertDeliverable: (
    id: string,
    fileName: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Reset
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: DeliverablesState = {
  items: [],
  loading: false,
  error: null,
  lastFetchKey: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useDeliverablesStore = create<
  DeliverablesState & DeliverablesActions
>()((set, get) => ({
  ...initialState,

  // ===========================================================================
  // FETCH ACTIONS
  // ===========================================================================

  fetchDeliverables: async (
    workspaceId: string,
    projectId: string,
    stageId: string,
  ) => {
    // Create a key to track this specific fetch
    const fetchKey = `${workspaceId}-${projectId}-${stageId}`;

    // Skip if already loading the same data
    if (get().loading && get().lastFetchKey === fetchKey) {
      console.log(
        '[deliverablesStore] Skipping duplicate fetch for:',
        fetchKey,
      );
      return;
    }

    set({
      loading: true,
      error: null,
      lastFetchKey: fetchKey,
    });

    try {
      const projectItems = await ProjectStageService.getStageArtifacts(
        workspaceId,
        projectId,
        stageId,
      );

      const items: DeliverableItem[] = projectItems.map((item) => ({
        ...item,
        id: item.id.toString(),
      }));

      set({
        items,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[deliverablesStore] Error fetching deliverables:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  // ===========================================================================
  // ITEM ACTIONS
  // ===========================================================================

  addItem: (item: DeliverableItem) => {
    set((state) => ({
      items: [item, ...state.items],
    }));
  },

  updateItem: (id: string, updates: Partial<DeliverableItem>) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  },

  removeItem: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  setItems: (items: DeliverableItem[]) => {
    set({ items });
  },

  // ===========================================================================
  // TOGGLE DELIVERABLE STATUS
  // ===========================================================================

  toggleDeliverableStatus: async (id: string) => {
    try {
      const response = await ProjectStageService.toggleDeliverable(id);

      if (!response.success && !response.updatedFiles) {
        throw new Error(response.error || 'Failed to toggle deliverable');
      }

      const newIsDeliverable = response.updatedFiles?.[id] ?? false;

      // If the file is no longer a deliverable, remove it from the list
      if (!newIsDeliverable) {
        get().removeItem(id);
      } else {
        // Otherwise update its status
        get().updateItem(id, { isDeliverable: newIsDeliverable });
      }

      return { success: true, newStatus: newIsDeliverable };
    } catch (error) {
      console.error('[deliverablesStore] Error toggling deliverable:', error);
      throw error;
    }
  },

  // ===========================================================================
  // REVERT DELIVERABLE
  // ===========================================================================

  revertDeliverable: async (id: string) => {
    try {
      const { success, newStatus } = await get().toggleDeliverableStatus(id);

      if (success && !newStatus) {
        toast({
          title: 'Removed from Deliverables',
          description: `"${
            get().items.find((item) => item.id === id)?.title
          }" has been removed from deliverables.`,
        });
        return { success: true };
      }
      return { success: false, error: 'Failed to revert deliverable' };
    } catch (error) {
      console.error('[deliverablesStore] Error reverting deliverable:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to revert deliverable status.';

      toast({
        title: 'Action failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  },

  // ===========================================================================
  // RESET
  // ===========================================================================

  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// SELECTOR HELPERS
// =============================================================================

/**
 * Helper to get loading state
 */
export const useDeliverablesLoading = () => {
  return useDeliverablesStore((state) => state.loading);
};

/**
 * Helper to get items count
 */
export const useDeliverablesCount = () => {
  return useDeliverablesStore((state) => state.items.length);
};
