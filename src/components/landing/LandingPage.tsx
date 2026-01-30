import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ControlButton } from '@/components/ui/ControlButton';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/signup');
  };

  const handleLogIn = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-workspace-gradient flex items-center justify-center p-loop-8">
      <div className="flex flex-col items-center justify-center text-center space-y-loop-4">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <img
            src="/lovable-uploads/landing_loopops_logo.png"
            alt="Loop Ops Logo"
            className="max-w-[170px] h-auto"
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-loop-10">
          <h1 className="text-base font-bold text-neutral-grayscale-90">
            Transform your SDLC, one Loop at a time.
          </h1>

          {/* Buttons */}
          <div className="flex items-center justify-center space-x-loop-4">
            <ControlButton
              text="Log In"
              type="transparent_brand"
              size="lg"
              onClick={handleLogIn}
              className="font-bold"
            />
            <ControlButton
              text="Sign Up"
              type="default"
              size="lg"
              onClick={handleSignUp}
              className="font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
