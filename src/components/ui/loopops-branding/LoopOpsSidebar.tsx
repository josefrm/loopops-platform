import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { cn } from '@/lib/utils';
import { buildNavigationUrl } from '@/utils/navigationHelpers';
import { FolderOpen } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ControlIcon, ControlIconType } from '../ControlIcon';
import { useCurtainTransition } from '../CurtainTransition';
import { HouseIcon } from '../icons/HouseIcon';

interface LoopOpsSidebarProps {
  className?: string;
  position?: 'left' | 'right';
}

export const LoopOpsSidebar = React.forwardRef<
  HTMLDivElement,
  LoopOpsSidebarProps
>(({ className, position = 'left' }, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { triggerCurtain, isAnimating } = useCurtainTransition();
  const sessionStore = useSessionStore();
  const activeTabId = sessionStore.activeSessionId || '';
  const tabs = Object.keys(sessionStore.sessionsByTab).map((tabId) => ({
    id: tabId,
    ...sessionStore.sessionsByTab[tabId],
  }));

  // Handler for curtain navigation
  const handleCurtainNavigation = (
    targetPath: string,
    // direction: CurtainDirection,
  ) => {
    if (isAnimating) return; // Prevent multiple triggers

    navigate(targetPath);
    // triggerCurtain(
    //   direction,
    //   () => {
    //     // This is called at the midpoint when the curtain fully covers the screen
    //   },
    //   () => {},
    // );
  };

  // Show only one icon at a time based on current location
  const getCurrentSidebarItem = () => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);

    if (location.pathname === '/mindspace') {
      const targetUrl = buildNavigationUrl('/', { searchParams, activeTab });
      return {
        icon: <HouseIcon fill="var(--neutral-grayscale-0)" width={24} />,
        label: 'Project Context',
        type: 'filter',
        active: true,
        // Use curtain transition for Mindspace -> Project Context
        onClick: () => handleCurtainNavigation(targetUrl, 'left-to-right'),
      };
    } else if (location.pathname === '/') {
      const targetUrl = buildNavigationUrl('/mindspace', {
        searchParams,
        activeTab,
      });
      return {
        icon: <FolderOpen size={20} />,
        label: 'Mindspace',
        type: 'filter',
        active: true,
        // Use curtain transition for Project Context -> Mindspace
        onClick: () => handleCurtainNavigation(targetUrl, 'right-to-left'),
      };
    } else if (location.pathname === '/chat') {
      const targetUrl = buildNavigationUrl('/', { searchParams, activeTab });
      // On chat page, show both navigation options
      return {
        icon: <HouseIcon fill="var(--neutral-grayscale-0)" width={24} />,
        label: 'Project Context',
        type: 'filter',
        active: false,
        // Use curtain transition for Chat -> Project Context (left to right)
        onClick: () => handleCurtainNavigation(targetUrl, 'left-to-right'),
      };
    }

    // Default to showing Project Context icon when not on mindspace page
    return {
      to: '/', // Fallback to regular navigation for other pages
      icon: <FolderOpen size={20} />,
      label: 'Project Context',
      type: 'filter',
      active: false,
      onClick: () => console.log('Project Context clicked'),
    };
  };

  const sidebarItems = [getCurrentSidebarItem()];

  // Handler for logo click - navigate to Chat
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;

    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const targetUrl = buildNavigationUrl('/chat', { searchParams, activeTab });

    // Determine direction based on current page
    // From Mindspace -> Chat: we go "left" conceptually (right-to-left curtain)
    // From Project Context -> Chat: we go "right" conceptually (left-to-right curtain)
    const direction =
      location.pathname === '/mindspace' ? 'left-to-right' : 'right-to-left';

    triggerCurtain(
      direction,
      () => navigate(targetUrl),
      () => {},
    );
  };

  return (
    <div
      ref={ref}
      className={cn(
        'fixed top-0 h-full w-loop-20 bg-white border-neutral-grayscale-20 z-10 flex flex-col p-loop-4 space-y-loop-5',
        position === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        className,
      )}
    >
      {/* Logo or brand area */}
      <div className="h-loop-12 flex items-center justify-center">
        <button
          onClick={handleLogoClick}
          disabled={isAnimating}
          className="transition-opacity hover:opacity-80 cursor-pointer bg-transparent border-none p-loop-3 -m-loop-3"
        >
          <img
            src="/lovable-uploads/loop_ops_small.png"
            alt="LoopOps"
            width={32}
            height={32}
            className="object-contain"
          />
        </button>
        {/* <span className="text-white font-bold text-sm">L</span> */}
      </div>

      {/* small bar width 48px var color corresponding to #DBDBDB */}
      <div className="w-loop-12 h-[1px] bg-neutral-grayscale-30 mx-auto" />

      {/* Navigation items */}
      <div className="flex flex-col items-center space-y-loop-5 flex-1">
        {sidebarItems.map((item, index) => (
          <ControlIcon
            key={index}
            to={'to' in item ? item.to : undefined} // Only use `to` if explicitly set (fallback case)
            icon={item.icon}
            label={item.label}
            type={item.type as ControlIconType}
            active={item.active}
            onClick={item?.onClick}
          />
        ))}
      </div>
    </div>
  );
});

LoopOpsSidebar.displayName = 'LoopOpsSidebar';
