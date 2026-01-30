import React from 'react';
import { useVersion } from '@/hooks/useVersion';
import { cn } from '@/lib/utils';

interface VersionDisplayProps {
  className?: string;
  showLabel?: boolean;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({
  className,
  showLabel = false,
}) => {
  const { getDisplayVersion } = useVersion();
  const version = getDisplayVersion();

  return (
    <div
      className={cn(
        'flex items-center text-xs text-gray-500 font-mono',
        className,
      )}
    >
      {showLabel && <span className="mr-1">Version:</span>}
      <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
        {version}
      </span>
    </div>
  );
};
