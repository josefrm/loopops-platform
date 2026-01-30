import { OnboardingFlowV2 } from '@/components/onboarding/OnboardingFlowV2';
import { OnboardingV2 } from '@/components/onboarding/OnboardingV2';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      console.log('Onboarding: No user, redirecting to landing');
      navigate('/landing', { replace: true });
      return;
    }

    if (user && !isInitialized) {
      console.log('Onboarding: Initializing for user:', user.id);
      setIsInitialized(true);
    }
  }, [user, loading, navigate, isInitialized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-grayscale-60">Loading...</p>
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
