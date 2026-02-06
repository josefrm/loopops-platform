import { useAuth } from '@/contexts/AuthContext';
import { useSidebarWidth } from '@/contexts/SidebarWidthContext';
import { useToast } from '@/hooks/use-toast';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { cn } from '@/lib/utils';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { History, MessageCircleMore } from 'lucide-react';
import React, { forwardRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ControlIcon } from '../ControlIcon';
import { useCurtainTransition } from '../CurtainTransition';
import { LoopOpsIcon } from '../icons/LoopOpsIcon';
import { SettingsGearIcon } from '../icons/SettingsGearIcon';
import { TextureIcon } from '../icons/TextureIcon';

interface LoopOpsSidebarLeftProps {
  className?: string;
}

export const LoopOpsSidebarLeft = forwardRef<
  HTMLDivElement,
  LoopOpsSidebarLeftProps
>(({ className }, ref) => {
  const { setLeftSidebarWidth } = useSidebarWidth();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerCurtain, isAnimating } = useCurtainTransition();
  const { signOut } = useAuth();
  const { toast } = useToast();

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle profile navigation
  const handleAccountSettings = () => {
    if (isAnimating) return;

    triggerCurtain(
      'left-to-right',
      () => navigate('/profile'),
      () => {},
    );
  };

  const handleIntegrationsClick = () => {
    if (isAnimating) return;

    triggerCurtain(
      'left-to-right',
      () => navigate('/integrations?tab=integrations'),
      () => {},
    );
  };

  const { width, setWidth } = useSidebarResize({
    side: 'left',
    minWidth: 80,
    maxWidth: 220,
    defaultWidth: 80,
    onWidthChange: setLeftSidebarWidth,
  });

  useEffect(() => {
    setWidth(80);
  }, [setWidth]);

  // Handler for navigating to Project Context with curtain animation
  const handleProjectContextClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;
    if (location.pathname === '/') return;

    triggerCurtain(
      'left-to-right', // From Chat -> Project Context
      () => navigate('/'),
      () => {},
    );
  };

  // Handler for navigating to Mindspace with curtain animation
  const handleMindspaceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;
    if (location.pathname === '/mindspace') return;

    triggerCurtain(
      'left-to-right', // From Chat -> Project Context
      () => navigate('/mindspace'),
      () => {},
    );
  };

  // Handler for navigating to Chat with curtain animation
  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;
    if (location.pathname === '/chat') return;

    // Get current stage priority from store to preserve stage selection
    const currentStageId = useWorkspaceProjectStore.getState().currentStageId;
    const stages = useWorkspaceProjectStore.getState().stages;
    const currentStage = stages.find((s) => s.id === currentStageId);

    triggerCurtain(
      'left-to-right', // From Project Context -> Chat
      () => {
        // Include stage param to preserve the last-used stage
        if (currentStage?.priority) {
          navigate(`/chat?stage=${currentStage.priority}`);
        } else {
          navigate('/chat');
        }
      },
      () => {},
    );
  };

  // Handler for navigating to Loops with curtain animation
  const handleLoopsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAnimating) return;
    if (location.pathname === '/loops') return;

    triggerCurtain(
      'left-to-right',
      () => navigate('/loops'),
      () => {},
    );
  };

  const indicatorWidth = 16;
  const totalSidebarWidth = width + indicatorWidth;

  return (
    <div
      className={cn('fixed top-0 left-0 h-full z-20 flex flex-row')}
      style={{ width: `${totalSidebarWidth}px` }}
      ref={ref}
      data-testid="loopops-sidebar-left"
    >
      <div
        className={cn(
          'h-full bg-neutral-grayscale-0 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.05)] flex flex-col p-loop-4',
          className,
        )}
        style={{ width: `${width}px` }}
        data-testid="loopops-sidebar-left-content"
      >
        <div className="flex-1 flex flex-col items-center">
          <div className="flex flex-col space-y-loop-4 items-center w-full ">
            <ControlIcon
              type="default"
              label="LoopOps Hub"
              icon={<LoopOpsIcon width={20} />}
              onClick={handleProjectContextClick}
              disabled={isAnimating}
              active={location.pathname === '/'}
            />

            <div className="w-full h-px bg-neutral-grayscale-30" />

            <ControlIcon
              type="default"
              label="Create Loop"
              icon={<MessageCircleMore width={20} />}
              onClick={handleChatClick}
              disabled={isAnimating}
              active={location.pathname === '/chat'}
            />

            <ControlIcon
              type="default"
              label="Mindspace"
              icon={<TextureIcon width={20} />}
              onClick={handleMindspaceClick}
              disabled={isAnimating}
              active={location.pathname === '/mindspace'}
            />

            <ControlIcon
              type="default"
              label="Loop History"
              icon={<History size={20} />}
              onClick={handleLoopsClick}
              disabled={isAnimating}
              active={location.pathname === '/loops'}
            />

            <ControlIcon
              type="default"
              label="Settings"
              icon={<SettingsGearIcon width={20} fill="currentColor" />}
              onClick={() => {}}
              disabled={isAnimating}
              dropdownOptions={[
                {
                  name: 'Integrations',
                  action: handleIntegrationsClick,
                },
                {
                  name: 'Account Settings',
                  action: handleAccountSettings,
                },
                {
                  name: 'Logout',
                  action: handleLogout,
                },
              ]}
              dropdownAlign="start"
            />
          </div>
          <div className="h-[110px] w-full" />
        </div>
      </div>
    </div>
  );
});

LoopOpsSidebarLeft.displayName = 'LoopOpsSidebarLeft';
