import React from 'react';
import { CircleControlIcon } from '../CircleControlIcon';
import { LoopItemIcon } from './LoopItemIcon';

interface ExternalLoopItemIconProps {
  type?: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}

export const ExternalLoopItemIcon: React.FC<ExternalLoopItemIconProps> = ({
  type,
  width = 24,
  height = 24,
  className = '',
  fill,
}) => {
  const normalizedType = type?.toLowerCase();

  // Map types to image paths
  let imagePath = null;

  if (normalizedType === 'figma') {
    imagePath = '/icons/Figma.svg';
  } else if (normalizedType === 'miro') {
    imagePath = '/icons/Miro.svg';
  } else if (normalizedType === 'bitbucket') {
    imagePath = '/icons/Bitbucket.svg';
  }

  if (imagePath) {
    return (
      <CircleControlIcon
        icon={null}
        image={imagePath}
        size="lg" // 24px
        type="white" // White background as per likely design
        className={`border-neutral-grayscale-30 ${className}`}
        label={type}
      />
    );
  }

  return (
    <LoopItemIcon
      width={width}
      height={height}
      className={className}
      fill={fill}
    />
  );
};
