import React from 'react';
import { cn } from '@/lib/utils';
import { useTypingEffect } from '@/hooks/useTypingEffect';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  interval?: number;
  onComplete?: () => void;
  className?: string;
  disabled?: boolean;
  cursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 2,
  interval = 50,
  onComplete,
  className,
  disabled = false,
  cursor = true,
}) => {
  const { displayText, isTyping } = useTypingEffect(text, {
    speed,
    interval,
    onComplete,
    disabled,
  });

  return (
    <span className={cn('inline', className)}>
      {displayText}
      {cursor && isTyping && !disabled && (
        <span className="animate-pulse text-brand-accent-50 font-bold ml-0.5">
          |
        </span>
      )}
    </span>
  );
};
