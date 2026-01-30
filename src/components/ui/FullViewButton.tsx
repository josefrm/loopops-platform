import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface FullViewButtonProps {
  handleClick?: () => void;
  className?: string;
}

export const FullViewButton: React.FC<FullViewButtonProps> = ({
  handleClick,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center ${className} space-y-loop-2 ml-loop-2 h-loop-20`}
      onClick={handleClick}
    >
      <div className="cursor-pointer w-loop-14 h-loop-14 bg-neutral-grayscale-20 hover:bg-neutral-grayscale-30 rounded-full flex items-center justify-center p-0 !mt-0">
        <ArrowLeft className="w-6 h-6 text-neutral-grayscale-60" />
      </div>
      <span
        className="text-neutral-grayscale-20 cursor-pointer"
        style={{
          fontSize: '12px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal',
        }}
      >
        Full View
      </span>
    </div>
  );
};
