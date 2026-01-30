import React from 'react';
import { cn } from '@/lib/utils';

interface ChatHeaderLogoProps {
  className?: string;
}

export const ChatHeaderLogo: React.FC<ChatHeaderLogoProps> = ({
  className = '',
}) => {
  return (
    <img
      src="/lovable-uploads/loopops_logo.png"
      alt="LoopOps"
      className={cn('h-loop-8 w-auto', className)}
      data-testid="chat-header-logo"
    />
  );
};
