import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-loop-4">
      <Loader2 className="w-8 h-8 animate-spin text-brand-accent-50" />
      <p className="text-neutral-grayscale-60 text-base">
        Loading conversation...
      </p>
    </div>
  );
};
