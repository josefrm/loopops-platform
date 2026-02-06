import { ControlButton } from '@/components/ui/ControlButton';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/signup');
  };

  const handleLogIn = () => {
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-loop-8 bg-white"
      style={{ backgroundImage: "url('/images/background/cover03.jpg')" }}
    >
      {/* Overlay for better text contrast if header is white/light, but here we use a glass card */}
      <div className="flex flex-col items-center justify-center text-center space-y-loop-4 bg-white/70 backdrop-blur-md rounded-3xl p-loop-12 shadow-2xl max-w-2xl w-full">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <img
            src="/images/loopops_icons/loopops_letters_black.png"
            alt="Loop Ops Logo"
            className="max-w-[200px] h-auto"
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-loop-10 w-full">
          <h1 className="text-xl md:text-2xl font-bold text-neutral-grayscale-90">
            Transform your SDLC, one Loop at a time.
          </h1>

          {/* Buttons */}
          <div className="flex items-center justify-center space-x-loop-4">
            <ControlButton
              text="Log In"
              type="transparent_brand"
              size="lg"
              onClick={handleLogIn}
              // className="font-bold bg-white/20 text-neutral-grayscale-0 border-none"
            />
            <ControlButton
              text="Sign Up"
              type="default"
              size="lg"
              onClick={handleSignUp}
              className="font-bold shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
