import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlButton } from '../ui/ControlButton';

export const OnboardingV2: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleGetStarted = () => {
    // Navigate to the new onboarding flow
    navigate('/onboarding/flow');
  };

  return (
    <div
      className="min-h-screen w-full px-[196px] py-[191px] bg-cover bg-center flex flex-col items-center justify-center p-loop-8 space-y-loop-8 relative"
      style={{ backgroundImage: "url('/images/background/cover02.png')" }}
    >
      {/* Main Content */}
      <div className="space-y-loop-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-[70px] shadow-2xl max-w-[1200px]">
        <div className="flex flex-col space-y-loop-2 align-items-left">
          <img
            src="/images/loopops_icons/loopops_black.svg"
            alt="Loop Ops Logo"
            className="w-[100px] h-auto"
          />
          <h1 className="text-[32px] font-bold text-neutral-grayscale-90">
            Welcome to LoopOps
          </h1>
          <p className="text-lg text-neutral-grayscale-90">
            The platform that turns your workflows into seamless, AI-powered
            collaboration.
          </p>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-loop-14">
          {/* Cell 1 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="">
              <h2 className="text-lg font-bold text-neutral-grayscale-90">
                Improve your SDLC, one Loop at a time.
              </h2>
              <p className="text-lg text-neutral-grayscale-90">
                AI-powered workflows help you move from scattered tasks to
                orchestrated progress.
              </p>
            </div>
          </div>

          {/* Cell 2 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="">
              <h2 className="text-lg font-bold text-neutral-grayscale-90">
                Your space to think and build.
              </h2>
              <p className="text-lg text-neutral-grayscale-90">
                A dedicated Mindspace lets your ideas grow while you keep your
                projects moving.
              </p>
            </div>
          </div>

          {/* Cell 3 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="">
              <h2 className="text-lg font-bold text-neutral-grayscale-90">
                Decide faster, with confidence.
              </h2>
              <p className="text-lg text-neutral-grayscale-90">
                LoopOps connects context, data, and AI insight to guide smarter
                decisions.
              </p>
            </div>
          </div>

          {/* Cell 4 */}
          <div className="flex items-center align-items-left space-x-loop-4">
            <div className="">
              <h2 className="text-lg font-bold text-neutral-grayscale-90">
                Integrate everything.
              </h2>
              <p className="text-lg text-neutral-grayscale-90">
                Plug in your tools and let LoopOps streamline your ecosystem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-neutral-grayscale-90 hover:text-neutral-grayscale-70 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign out</span>
          </button>

          <div className="flex items-center space-x-loop-4">
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
    </div>
  );
};
