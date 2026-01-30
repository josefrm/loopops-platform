import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarTabButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarTabButton: React.FC<SidebarTabButtonProps> = ({
  children,
  isActive = false,
  onClick,
  className,
}) => {
  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      onClick={onClick}
      className={cn(
        'w-full justify-start text-left',
        isActive && 'bg-primary text-primary-foreground',
        className,
      )}
    >
      {children}
    </Button>
  );
};
