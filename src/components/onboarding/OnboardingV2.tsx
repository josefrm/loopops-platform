import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlButton } from '../ui/ControlButton';

export const OnboardingV2: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (loading || !user?.id) {
        setCheckingStatus(false);
        return;
      }

      try {
        // Check v2 onboarding status
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
          setCheckingStatus(false);
          navigate('/', { replace: true });
          return;
        }
        // If user has progress but hasn't completed, stay on intro page
        setCheckingStatus(false);
      } catch (error) {
        console.error('Failed to load onboarding status:', error);
        setCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, loading, navigate]);

  const handleGetStarted = () => {
    // Navigate to the new onboarding flow
    navigate('/onboarding/flow');
  };

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen w-full bg-workspace-gradient flex items-center justify-center">
        <p className="text-neutral-grayscale-60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-[196px] py-[191px] bg-workspace-gradient flex flex-col items-center justify-center p-loop-8 space-y-loop-8">
      {/* Logo content */}
      <div className="flex items-center justify-center">
        <img
          src="/lovable-uploads/landing_loopops_logo.png"
          alt="Loop Ops Logo"
          className="max-w-[170px] h-auto"
        />
      </div>

      {/* Main Content */}
      <div className="space-y-loop-14 rounded-md bg-neutral-grayscale-0 p-[70px] shadow-lg">
        <div className="flex flex-col space-y-loop-2 align-items-left">
          <h1 className="text-[32px] font-bold">Welcome to LoopOps</h1>
          <p className="text-lg">
            The platform that turns your workflows into seamless, AI-powered
            collaboration.
          </p>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-loop-14">
          {/* Cell 1 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="text-[48px]">✨</div>
            <div className="">
              <h2 className="text-lg font-bold">
                Improve your SDLC, one Loop at a time.
              </h2>
              <p className="text-lg text-neutral-grayscale-70">
                AI-powered workflows help you move from scattered tasks to
                orchestrated progress.
              </p>
            </div>
          </div>

          {/* Cell 2 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="text-[48px]">🧠</div>
            <div className="">
              <h2 className="text-lg font-bold">
                Your space to think and build.
              </h2>
              <p className="text-lg text-neutral-grayscale-70">
                A dedicated Mindspace lets your ideas grow while you keep your
                projects moving.
              </p>
            </div>
          </div>

          {/* Cell 3 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="text-[48px]">🤖</div>
            <div className="">
              <h2 className="text-lg font-bold">
                Decide faster, with confidence.
              </h2>
              <p className="text-lg text-neutral-grayscale-70">
                LoopOps connects context, data, and AI insight to guide smarter
                decisions.
              </p>
            </div>
          </div>

          {/* Cell 4 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="text-[48px]">🔌</div>
            <div className="">
              <h2 className="text-lg font-bold">Integrate everything.</h2>
              <p className="text-lg text-neutral-grayscale-70">
                Plug in your tools and let LoopOps streamline your ecosystem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-loop-4">
          <span className="text-lg font-bold text-brand-accent-50">
            Ready to begin?
          </span>
          <ControlButton
            text="Let's get started"
            type="default"
            size="lg"
            onClick={handleGetStarted}
            className="!w-[240px] h-loop-10 text-base font-bold"
          />
        </div>
      </div>
    </div>
  );
};
