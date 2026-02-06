import { cn } from '@/lib/utils';
import React from 'react';

interface ChatHeaderLogoProps {
  className?: string;
}

export const ChatHeaderLogo: React.FC<ChatHeaderLogoProps> = ({
  className = '',
}) => {
  return (
    <img
      src="/images/loopops_icons/loopops_black.svg"
      alt="LoopOps"
      className={cn('h-loop-8 w-auto', className)}
      data-testid="chat-header-logo"
    />
  );
};
