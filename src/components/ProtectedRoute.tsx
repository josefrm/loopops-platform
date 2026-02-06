import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isFullyAuthenticated, checkOnboardingStatus } =
    useAuth();
  const location = useLocation();
  const [onboardingCheck, setOnboardingCheck] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const previousPathnameRef = React.useRef<string>(location.pathname);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (isCheckingOnboarding || !isFullyAuthenticated) {
        return;
      }

      setIsCheckingOnboarding(true);
      try {
        const needsOnboarding = await checkOnboardingStatus();
        setOnboardingCheck(needsOnboarding);
      } catch (error) {
        console.error('Error checking onboarding in ProtectedRoute:', error);
        // If there's an error checking onboarding, assume they don't need it
        setOnboardingCheck(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    // Reset onboarding check when navigating FROM onboarding pages TO non-onboarding pages
    // This ensures we re-check the status after onboarding completion
    const wasOnOnboardingPage =
      previousPathnameRef.current.includes('/onboarding');
    const isOnOnboardingPage = location.pathname.includes('/onboarding');

    if (
      wasOnOnboardingPage &&
      !isOnOnboardingPage &&
      onboardingCheck !== null
    ) {
      console.log(
        'ProtectedRoute: Transitioning from onboarding, resetting check',
      );
      setOnboardingCheck(null);
    }

    // Update the ref for next render
    previousPathnameRef.current = location.pathname;

    // Only check onboarding when we have a fully authenticated user and haven't checked yet
    if (
      isFullyAuthenticated &&
      onboardingCheck === null &&
      !isCheckingOnboarding
    ) {
      checkOnboarding();
    }
  }, [
    isFullyAuthenticated,
    checkOnboardingStatus,
    onboardingCheck,
    isCheckingOnboarding,
    user?.id,
    location.pathname,
  ]);

  // Show loading while auth is loading or while checking onboarding initially
  if (
    loading ||
    (isFullyAuthenticated && onboardingCheck === null && !isCheckingOnboarding)
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <img
            src="/images/loopops_icons/loopops_black.svg"
            alt="LoopOps"
            className={'h-loop-8 w-auto'}
          />
        </div>
      </div>
    );
  }

  // Redirect to landing if no user
  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  // If user is on onboarding page, let them stay (either new user or manually started)
  if (location.pathname.includes('/onboarding')) {
    return <>{children}</>;
  }

  // Only redirect to onboarding automatically if user needs it AND they're not already there
  if (onboardingCheck === true) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
