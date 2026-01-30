import React from 'react';
import { styleObjects } from '@/utils/colors';

interface AgentGradientIconProps {
  className?: string;
  isSpinning?: boolean;
}

export const AgentGradientIcon: React.FC<AgentGradientIconProps> = ({
  className = '',
  isSpinning = false,
}) => (
  <div
    className={`flex items-center justify-center ${className} ${
      isSpinning ? 'animate-spin' : ''
    }`}
    style={{
      width: 40,
      height: 40,
      flexShrink: 0,
      borderRadius: '50%',
      ...styleObjects.agentGradient,
      animationDuration: isSpinning ? '2s' : undefined,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: '#fff',
      }}
    />
  </div>
);
