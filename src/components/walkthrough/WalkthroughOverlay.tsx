import React from 'react';
import { WalkthroughInfo, WalkthroughButton } from './WalkthroughInfo';

interface WalkthroughOverlayProps {
  title: string;
  description: string;
  primaryButton?: WalkthroughButton;
  secondaryButton?: WalkthroughButton;
  isVisible: boolean;
  className?: string;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  title,
  description,
  primaryButton,
  secondaryButton,
  isVisible,
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-loop-16 ${className}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
    >
      <div className="relative">
        {/* Semi-transparent backdrop overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'transparent' }}
        />

        {/* Walkthrough Info Component */}
        <div className="relative z-10">
          <WalkthroughInfo
            title={title}
            description={description}
            primaryButton={primaryButton}
            secondaryButton={secondaryButton}
            centered={true}
          />
        </div>
      </div>
    </div>
  );
};
