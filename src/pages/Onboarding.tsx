import { OnboardingFlowV2 } from '@/components/onboarding/OnboardingFlowV2';
import { OnboardingV2 } from '@/components/onboarding/OnboardingV2';
import { AILoadingState } from '@/components/ui/AILoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Check auth status
    if (!loading && !user) {
      console.log('Onboarding: No user, redirecting to landing');
      navigate('/landing', { replace: true });
      return;
    }

    // Check onboarding status
    const checkOnboardingStatus = async () => {
      if (loading || !user?.id) {
        return; // Wait for auth
      }

      try {
        const { data, error } = await supabase
          .from('v2_onboarding')
          .select('stage, completed')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to check onboarding status:', error);
          setCheckingStatus(false);
          return;
        }

        if (data && data.completed) {
          // User has completed onboarding, redirect to main app
          console.log('Onboarding: Already completed, redirecting to home');
          navigate('/', { replace: true });
          return;
        }

        // If user has progress but hasn't completed, stay on onboarding
        setCheckingStatus(false);
      } catch (error) {
        console.error('Failed to load onboarding status:', error);
        setCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, navigate]);

  if (loading || checkingStatus) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url('/images/background/cover02.png')" }}
      >
        <AILoadingState message="Loading..." />
      </div>
    );
  }

  // Check if we're on the flow route
  if (location.pathname === '/onboarding/flow') {
    return <OnboardingFlowV2 />;
  }

  // Default to the intro screen
  return <OnboardingV2 />;
};

export default Onboarding;
