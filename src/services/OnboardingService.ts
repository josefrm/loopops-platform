import { supabase } from '@/integrations/supabase/client';

export interface OnboardingData {
  name: string;
  role?: string;
  profilePicture?: string;
  companyName: string;
  projectName: string;
}

export interface OnboardingStatus {
  user_id: string;
  current_step: number;
  completed: boolean;
  name?: string;
  role?: string;
  profile_picture?: string;
  company_name?: string;
  project_name?: string;
  created_at?: string;
  updated_at?: string;
}

export class OnboardingService {
  /**
   * Load the current onboarding status for a user
   */
  static async loadOnboardingStatus(
    userId: string,
  ): Promise<OnboardingStatus | null> {
    try {
      console.log(
        'OnboardingService: Loading onboarding status for user:',
        userId,
      );

      const { data, error } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(
          'OnboardingService: Error loading onboarding status:',
          error,
        );
        throw error;
      }

      if (data) {
        console.log(
          'OnboardingService: Found existing onboarding status:',
          data,
        );
        return data as OnboardingStatus;
      }

      console.log('OnboardingService: No existing onboarding status found');
      return null;
    } catch (error) {
      console.error('OnboardingService: Error in loadOnboardingStatus:', error);
      throw error;
    }
  }

  /**
   * Update the current onboarding step and data
   */
  static async updateOnboardingStep(
    userId: string,
    step: number,
    data?: Partial<OnboardingData>,
  ): Promise<void> {
    try {
      console.log(
        'OnboardingService: Updating onboarding step to:',
        step,
        'with data:',
        data,
      );

      const updateData = {
        user_id: userId,
        current_step: step,
        updated_at: new Date().toISOString(),
        ...(data && {
          name: data.name,
          role: data.role,
          profile_picture: data.profilePicture,
          company_name: data.companyName,
          project_name: data.projectName,
        }),
      };

      const { error } = await supabase
        .from('onboarding_status')
        .upsert(updateData, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error(
          'OnboardingService: Error updating onboarding step:',
          error,
        );
        throw error;
      }

      console.log('OnboardingService: Successfully updated onboarding step');
    } catch (error) {
      console.error('OnboardingService: Error in updateOnboardingStep:', error);
      throw error;
    }
  }

  /**
   * Complete the onboarding process
   */
  static async completeOnboarding(
    userId: string,
    data: OnboardingData,
  ): Promise<void> {
    try {
      console.log('OnboardingService: Completing onboarding for user:', userId);

      const { error } = await supabase.from('onboarding_status').upsert(
        {
          user_id: userId,
          name: data.name,
          role: data.role,
          profile_picture: data.profilePicture,
          company_name: data.companyName,
          project_name: data.projectName,
          completed: true,
          current_step: 3,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      );

      if (error) {
        console.error('OnboardingService: Error completing onboarding:', error);
        throw error;
      }

      console.log('OnboardingService: Successfully completed onboarding');
    } catch (error) {
      console.error('OnboardingService: Error in completeOnboarding:', error);
      throw error;
    }
  }

  /**
   * Show completion view with a brief delay for UX
   */
  static async showCompletionView(): Promise<void> {
    // Simulate a brief delay for UX
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('OnboardingService: Showing completion view');
  }

  /**
   * Check if user can access a specific onboarding step
   */
  static async canAccessStep(
    userId: string,
    requestedStep: number,
  ): Promise<boolean> {
    try {
      const status = await this.loadOnboardingStatus(userId);

      // If no onboarding status exists, user can only access step 1
      if (!status) {
        return requestedStep === 1;
      }

      // If onboarding is completed, user can access any step
      if (status.completed) {
        return true;
      }

      // User can access current step or any previous step
      return requestedStep <= status.current_step;
    } catch (error) {
      console.error('OnboardingService: Error checking step access:', error);
      // In case of error, allow access to step 1 only
      return requestedStep === 1;
    }
  }

  /**
   * Get the current step number from the URL path
   */
  static getStepFromPath(pathname: string): number {
    const stepMatch = pathname.match(/\/onboarding\/step-(\d+)/);
    if (stepMatch) {
      return parseInt(stepMatch[1], 10);
    }

    // Default onboarding path corresponds to step 1 (intro)
    if (pathname === '/onboarding') {
      return 1;
    }

    return 1;
  }

  /**
   * Get the next step URL for navigation
   */
  static getNextStepUrl(currentStep: number): string {
    const nextStep = currentStep + 1;

    if (nextStep > 3) {
      // After step 3, redirect to main app
      return '/';
    }

    return `/onboarding/step-${nextStep}`;
  }
}
