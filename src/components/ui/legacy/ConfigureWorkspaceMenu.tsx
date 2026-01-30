import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';

interface MenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKnowledgeBaseClick?: () => void;
  onKnowledgeBaseV2Click?: () => void;
  onJiraCredentialsClick?: () => void;
  onGithubSettingsClick?: () => void;
  className?: string;
  title?: string;
  triggerRef?: React.RefObject<HTMLElement>;
}

interface ConfigureWorkspaceMenuItemProps {
  label: string;
  onClick?: () => void;
  className?: string;
}

const ConfigureWorkspaceMenuItem: React.FC<ConfigureWorkspaceMenuItemProps> = ({
  label,
  onClick,
  className,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'p-loop-1 cursor-pointer w-full justify-start h-auto text-white rounded-sm hover:bg-brand-accent-50 hover:text-white transition-all duration-300 ease-in-out',
      'flex items-center rounded-lg text-base font-normal group',
      'hover:shadow-lg',
      className,
    )}
  >
    <span className="text-neutral-grayscale-20 text-base font-sans font-normal not-italic text-left leading-normal transition-all duration-300">
      {label}
    </span>
  </div>
);

export const ConfigureWorkspaceMenu: React.FC<MenuDialogProps> = ({
  open,
  onOpenChange,
  onKnowledgeBaseClick,
  onKnowledgeBaseV2Click,
  onJiraCredentialsClick,
  onGithubSettingsClick,
  className,
  title = 'Configure Workspace',
  triggerRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  // Calculate position based on trigger button
  useEffect(() => {
    if (open && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.left, // Align left edge with button
      });
    }
  }, [open, triggerRef]);

  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange, triggerRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed w-64 p-0 border-0 shadow-2xl rounded-2xl z-[9999]',
        'bg-neutral-grayscale-90 text-white w-[231px]', // Adjusted to align with trigger button
        className,
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-loop-6">
        <h3 className="text-white text-base font-bold mb-[12px] font-sans not-italic text-left leading-normal">
          {title}
        </h3>
        <div className="space-y-loop-1">
          <ConfigureWorkspaceMenuItem
            label="Knowledge Base"
            onClick={onKnowledgeBaseClick}
          />
          <hr className="border-neutral-grayscale-70" />
          <ConfigureWorkspaceMenuItem
            label="Knowledge Base V2"
            onClick={onKnowledgeBaseV2Click}
          />
          <hr className="border-neutral-grayscale-70" />
          <ConfigureWorkspaceMenuItem
            label="Jira credentials"
            onClick={onJiraCredentialsClick}
          />
          <hr className="border-neutral-grayscale-70" />
          <ConfigureWorkspaceMenuItem
            label="Github settings"
            onClick={onGithubSettingsClick}
          />
        </div>
      </div>
    </div>
  );
};
