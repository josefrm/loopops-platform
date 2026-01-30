import { STORAGE_KEYS } from '@/constants/storageKeys';
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from './StorageService';

export const UserPreferencesService = {
  /**
   * Calls the edge function to mark a walkthrough as completed.
   * @param windowKey The key identifying the walkthrough window (e.g., 'chat', 'mindspace')
   */
  async completeWalkthrough(windowKey: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke(
        'complete-walkthrough',
        {
          body: { window_key: windowKey },
        },
      );

      if (error) {
        console.error('Failed to complete walkthrough:', error);
        // We don't throw here to avoid blocking the UI if the backend call fails,
        // since we already update local storage separately.
      }
    } catch (err) {
      console.error('Error invoking complete-walkthrough function:', err);
    }
  },

  /**
   * Fetches the latest user preferences from the database.
   */
  async fetchUserPreferences(userId: string) {
    const { data, error } = await (
      supabase.from('v2_user_preferences' as any) as any
    )
      .select('walkthroughs')
      .eq('profile_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
    return data as { walkthroughs: any } | null;
  },

  /**
   * Syncs the walkthrough status from the DB to local session storage.
   * This should be called on app initialization or login.
   */
  async syncWalkthroughStatus(userId: string): Promise<void> {
    const preferences = await this.fetchUserPreferences(userId);
    if (!preferences || !preferences.walkthroughs) return;

    // Type casting assuming the structure of walkthroughs JSONB
    const walkthroughs = preferences.walkthroughs as Record<string, boolean>;

    // Map DB keys to Storage keys
    // We assume the DB keys are 'chat' and 'mindspace' matching the window names

    if (walkthroughs['chat']) {
      StorageService.setItem(
        STORAGE_KEYS.CHAT_WALKTHROUGH_COMPLETED,
        true,
        'local',
      );
    }

    if (walkthroughs['mindspace']) {
      StorageService.setItem(
        STORAGE_KEYS.MINDSPACE_WALKTHROUGH_COMPLETED,
        true,
        'local',
      );
    }

    if (walkthroughs['project_context']) {
      StorageService.setItem(
        STORAGE_KEYS.PROJECT_CONTEXT_WALKTHROUGH_COMPLETED,
        true,
        'local',
      );
    }
  },
};
