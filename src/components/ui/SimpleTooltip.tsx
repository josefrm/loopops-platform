import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

interface SimpleTooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayDuration?: number;
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  side = 'right',
  delayDuration,
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="z-[999999] bg-neutral-grayscale-90 text-neutral-grayscale-0"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
