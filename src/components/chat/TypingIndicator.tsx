import { Card } from '@/components/ui/card';
import React from 'react';

interface TypingIndicatorProps {
  avatar: React.ReactNode;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ avatar }) => {
  return (
    <div className="flex justify-start">
      <div className="flex items-start">
        {avatar}
        <Card
          className="p-loop-2 bg-white rounded-[1rem] border border-neutral-grayscale-30"
          style={{ boxShadow: '0 8px 20px 0 rgba(0, 0, 0, 0.05)' }}
        >
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
