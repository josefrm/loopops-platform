import React from 'react';
import { gradients, styleObjects } from '@/utils/colors';

export const brandGradient = styleObjects.brandGradient;

export const brandColors = {
  gradientStart: '#2E9BA7',
  gradientMid1: '#2E60A7',
  gradientMid2: '#4A2EA7',
  gradientEnd: '#9D2EA7',
  gradient: gradients.brand,
};

// Agent gradient colors for AgentGradientIcon
export const agentGradient = styleObjects.agentGradient;

interface BrandGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export const BrandGradientText: React.FC<BrandGradientTextProps> = ({
  children,
  className = '',
}) => {
  return (
    <span className={className} style={styleObjects.brandGradientText}>
      {children}
    </span>
  );
};

interface BrandGradientBoxProps {
  children?: React.ReactNode;
  className?: string;
}

export const BrandGradientBox: React.FC<BrandGradientBoxProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className} style={styleObjects.brandGradient}>
      {children}
    </div>
  );
};
