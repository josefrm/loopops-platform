import React from 'react';
import { useChatViewStore } from '@/stores/chatViewStore';
import { SizeToggle } from '@/components/ui/SizeToggle';

interface ChatHeaderControlsProps {
  className?: string;
}

export const ChatHeaderControls: React.FC<ChatHeaderControlsProps> = ({
  className = '',
}) => {
  const { isMaximized, toggleMaximize } = useChatViewStore();

  const handleMaximize = () => {
    if (!isMaximized) toggleMaximize();
  };
  const handleMinimize = () => {
    if (isMaximized) toggleMaximize();
  };

  return (
    <SizeToggle
      isMaximized={isMaximized}
      onMaximize={handleMaximize}
      onMinimize={handleMinimize}
      className={className}
      maximizeTitle="Maximize chat"
      minimizeTitle="Minimize chat"
    />
  );
};
