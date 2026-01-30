import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MindspaceDocument } from '@/models/MindspaceDocument';
import { useCallback, useEffect, useState } from 'react';

// Mindspace-specific category interface
export interface MindspaceCategory {
  id: number;
  name: string;
  priority?: number;
}

// Mindspace tab item interface
export interface MindspaceTabItem {
  id: number | string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  uploadProgress?: number;
  isUploaded?: boolean;
  signedUrl?: string;
  mimeType?: string;
  created_at?: Date;
  belongsToStage?: boolean;
  createdInEditor?: boolean;
  categoryId?: number;
}

export const useMindspaceCategories = () => {
  const [categories, setCategories] = useState<MindspaceCategory[]>([
    { id: 1, name: 'All', priority: 1 },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch categories from the backend
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke(
        'get-mindspace-categories',
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        },
      );

      if (error) throw error;

      if (data && data.categories) {
        // Ensure "All" is always present and first
        const fetchedCategories = data.categories.filter(
          (c: MindspaceCategory) => c.name !== 'All',
        );
        setCategories([
          { id: 1, name: 'All', priority: 1 },
          ...fetchedCategories,
        ]);
      }
    } catch (error) {
      console.error('Error fetching mindspace categories:', error);
      // Fallback to defaults is already in state
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auth subscription
  useEffect(() => {
    fetchCategories();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchCategories();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCategories]);

  // Create a new category
  const createCategory = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error('No active session');

        const { data, error } = await supabase.functions.invoke(
          'create-mindspace-category',
          {
            body: { name },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          },
        );

        if (error) throw error;

        if (data && data.categories) {
          const fetchedCategories = data.categories.filter(
            (c: MindspaceCategory) => c.name !== 'All',
          );
          setCategories([
            { id: 1, name: 'All', priority: 1 },
            ...fetchedCategories,
          ]);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error creating category:', error);
        toast({
          title: 'Error creating category',
          description: 'Please try again later.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast],
  );

  const getTabCategoryId = useCallback(
    (tabName: string): number => {
      const category = categories.find((c) => c.name === tabName);
      return category ? category.id : 1;
    },
    [categories],
  );

  const getCategoryTabName = useCallback(
    (categoryId: number): string => {
      const category = categories.find((c) => c.id === categoryId);
      return category ? category.name : 'All';
    },
    [categories],
  );

  // Update file category using the new edge function
  const updateFileCategory = useCallback(
    async (
      fileIds: (string | number)[],
      categoryId: number,
    ): Promise<boolean> => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error('No active session');

        const { error } = await supabase.functions.invoke(
          'move-mindspace-files',
          {
            body: { fileIds, categoryId },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          },
        );

        if (error) throw error;

        return true;
      } catch (error) {
        console.error('Error updating file category:', error);
        return false;
      }
    },
    [],
  );

  // Filter items based on category
  const filterItemsByCategory = useCallback(
    (
      documents: MindspaceDocument[],
      categoryId: number,
    ): MindspaceTabItem[] => {
      // Convert documents to MindspaceTabItem format
      const documentItems: MindspaceTabItem[] = documents.map((doc, index) => {
        const itemId = doc.id || `temp-${Date.now()}-${index}`;
        
        return {
          id: itemId,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          uploadProgress: doc.uploadProgress,
          isUploaded: doc.isUploaded,
          signedUrl: doc.signedUrl,
          mimeType: doc.mimeType,
          created_at: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          belongsToStage: doc.belongsToStage,
          createdInEditor: doc.createdInEditor,
          categoryId: doc.categoryId, // Pass through categoryId
        };
      });

      // Filter based on category
      const categoryName = getCategoryTabName(categoryId);
      let filteredItems = documentItems;

      if (categoryName !== 'All') {
        // Filter by categoryId
        filteredItems = documentItems.filter((item) => {
          // If item has a categoryId, match it.
          // If item doesn't have categoryId (e.g. upload in progress/mock), default to undefined?
          // The database defaults to 1 (All).
          // If we are in "Notes" (id=4), we only show items with categoryId=4.
          return item.categoryId === categoryId;
        });
      }

      // Preserve the upload/recent sorting logic as it is good UX
      const uploadingItems = filteredItems.filter(
        (item) =>
          item.uploadProgress !== undefined && item.uploadProgress < 100,
      );

      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      const recentlyCreatedItems = filteredItems.filter(
        (item) =>
          item.createdInEditor &&
          item.created_at &&
          item.created_at > thirtySecondsAgo &&
          (item.uploadProgress === undefined || item.uploadProgress >= 100),
      );

      const completedItems = filteredItems.filter(
        (item) =>
          (item.uploadProgress === undefined || item.uploadProgress >= 100) &&
          !(
            item.createdInEditor &&
            item.created_at &&
            item.created_at > thirtySecondsAgo
          ),
      );

      return [...uploadingItems, ...recentlyCreatedItems, ...completedItems];
    },
    [getCategoryTabName],
  );

  return {
    categories,
    isLoading,
    getTabCategoryId,
    getCategoryTabName,
    updateFileCategory,
    filterItemsByCategory,
    createCategory,
  };
};
