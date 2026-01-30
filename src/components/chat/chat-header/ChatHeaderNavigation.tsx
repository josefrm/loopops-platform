import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { TeamNavigation } from './TeamNavigation';

interface ChatHeaderNavigationProps {
  className?: string;
}

export const ChatHeaderNavigation = forwardRef<
  HTMLDivElement,
  ChatHeaderNavigationProps
>(({ className = '' }, ref) => {
  return (
    <div ref={ref} className={cn('flex items-center', className)} data-testid="chat-header-navigation">
      <TeamNavigation variant="navigation" />
    </div>
  );
});
