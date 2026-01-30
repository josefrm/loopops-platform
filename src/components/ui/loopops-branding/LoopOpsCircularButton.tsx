import React from 'react';
import { LoopOpsLogo } from './LoopOpsLogo';
import { GradientLoopOpsLogo } from './GradientLoopOpsLogo';

interface LoopOpsCircularButtonProps {
  onClick: () => void;
  className?: string;
}

const LoopOpsCircularButton: React.FC<LoopOpsCircularButtonProps> = ({
  onClick,
  className = '',
}) => {
  const getButtonIcon = () => {
    return <LoopOpsLogo width={20} height={20} fill="white" />;
  };

  const getHoverIcon = () => {
    return <GradientLoopOpsLogo width={20} height={20} />;
  };

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <button
        onClick={onClick}
        className="w-loop-10 h-loop-10 rounded-full text-white flex items-center justify-center transition-all duration-300 ease-in-out bg-brand-accent-50 hover:bg-neutral-grayscale-60 group relative"
      >
        {/* Default icon */}
        <span className="group-hover:opacity-0 transition-opacity duration-300 ease-in-out">
          {getButtonIcon()}
        </span>
        {/* Hover icon (gradient) */}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
          {getHoverIcon()}
        </span>
      </button>
    </div>
  );
};

export default LoopOpsCircularButton;
