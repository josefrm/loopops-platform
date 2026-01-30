import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { buildNavigationUrl } from '@/utils/navigationHelpers';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurtainTransition } from '../CurtainTransition';
import { HouseIcon } from '../icons/HouseIcon';
import { SizeToggle } from '../SizeToggle';

interface SidebarHeaderProps {
  projectName: string;
  stageName: string;
  isMaximized: boolean;
  onMaximize: () => void;
  onMinimize: () => void;
  showSizeToggle?: boolean;
  projectContextResizeRef?: React.RefObject<HTMLDivElement>;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  projectName,
  stageName,
  isMaximized,
  onMaximize,
  onMinimize,
  projectContextResizeRef,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { triggerCurtain, isAnimating } = useCurtainTransition();
  const sessionStore = useSessionStore();
  const activeTabId = sessionStore.activeSessionId || '';
  const tabs = Object.keys(sessionStore.sessionsByTab).map((tabId) => ({
    id: tabId,
    ...sessionStore.sessionsByTab[tabId],
  }));

  // Handler for navigating to Project Context with curtain animation
  const handleProjectContextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;

    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const targetUrl = buildNavigationUrl('/', { searchParams, activeTab });

    triggerCurtain(
      'left-to-right', // From Chat -> Project Context
      () => navigate(targetUrl),
      () => {},
    );
  };

  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-loop-4 pb-loop-4">
      <div className="self-stretch inline-flex justify-between items-center">
        <button
          onClick={handleProjectContextClick}
          disabled={isAnimating}
          data-action="ProjectKB"
          data-state="Default"
          data-type="Oval-medium"
          className="w-loop-12 h-loop-8 bg-brand-accent-50 rounded-full flex justify-center items-center gap-loop-1 transition-opacity hover:opacity-80 cursor-pointer border-none"
        >
          <HouseIcon width={24} fill="var(--neutral-grayscale-0)" />
        </button>
        <SizeToggle
          ref={projectContextResizeRef}
          isMaximized={isMaximized}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
          maximizeTitle="Maximize milestone tracker"
          minimizeTitle="Minimize milestone tracker"
        />
      </div>
      <div className="self-stretch flex flex-col justify-start items-start gap-loop-1">
        <div className="self-stretch justify-start text-neutral-grayscale-90 text-base font-bold font-sans">
          {projectName}
        </div>
        <div className="self-stretch justify-start text-brand-accent-50 text-lg font-bold font-sans">
          {stageName}
        </div>
      </div>
    </div>
  );
};
