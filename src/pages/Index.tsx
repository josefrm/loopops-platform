import { ChatControllerProvider } from '@/components/chat/ChatController';
import { MainChatArea } from '@/components/chat/MainChatArea';
import { MilestonesSidebar } from '@/components/ui/MilestonesSidebar';
import { UniversalDialog } from '@/components/ui/UniversalDialog';
import { LoopOpsSidebarLeft } from '@/components/ui/loopops-branding/LoopOpsSidebarLeft';
import { LoopOpsSidebarRight } from '@/components/ui/loopops-branding/LoopOpsSidebarRight';
import { WalkthroughInfo } from '@/components/walkthrough/WalkthroughInfo';
import { WalkthroughOverlay } from '@/components/walkthrough/WalkthroughOverlay';
import { useIndexWalkthroughSteps } from '@/components/walkthrough/indexWalkthroughHelpers';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { DialogControlProvider } from '@/contexts/DialogControlContext';
import { SessionProvider } from '@/contexts/SessionSyncContext';
import {
  SidebarWidthProvider,
  useSidebarWidth,
} from '@/contexts/SidebarWidthContext';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { StorageService } from '@/services/StorageService';
import { UserPreferencesService } from '@/services/UserPreferencesService';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMilestonesSidebarViewStore } from '@/stores/milestonesSidebarViewStore';

const MainContent = () => {
  const { leftSidebarWidth, rightSidebarWidth, milestonesSidebarWidth } =
    useSidebarWidth();
  const isMilestonesMaximized = useMilestonesSidebarViewStore(
    (state) => state.isMaximized,
  );

  // Walkthrough state
  const [walkthroughCompleted, setWalkthroughCompleted] = useState(() => {
    return (
      StorageService.getItem<boolean>(
        STORAGE_KEYS.CHAT_WALKTHROUGH_COMPLETED,
        'local',
      ) || false
    );
  });

  // Walkthrough refs
  const chatHeaderNavigationRef = useRef<HTMLDivElement>(null);
  const inputChatContainerRef = useRef<HTMLTextAreaElement>(null);
  const mindspaceResizeRef = useRef<HTMLDivElement>(null);
  const projectContextResizeRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const handleSkipToFinalStep = () => {
    setWalkthroughCompleted(true);
    StorageService.setItem(
      STORAGE_KEYS.CHAT_WALKTHROUGH_COMPLETED,
      true,
      'local',
    );
    UserPreferencesService.completeWalkthrough('chat');
  };

  // Create walkthrough steps using helper function
  const walkthroughSteps = useIndexWalkthroughSteps(
    {
      chatHeaderNavigationRef,
      inputChatContainerRef,
      projectContextResizeRef,
      mindspaceResizeRef,
    },
    {
      onNextStep: () => walkthrough.nextStep(),
      onSkipWalkthrough: () => {
        walkthrough.skipWalkthrough();
        setWalkthroughCompleted(true);
        UserPreferencesService.completeWalkthrough('chat');
      },
      onFinishWalkthrough: () => {
        walkthrough.skipWalkthrough();
        setWalkthroughCompleted(true);
        StorageService.setItem(
          STORAGE_KEYS.CHAT_WALKTHROUGH_COMPLETED,
          true,
          'local',
        );
        UserPreferencesService.completeWalkthrough('chat');
        navigate('/mindspace');
      },
      onSkipToFinalStep: handleSkipToFinalStep,
    },
  );

  const walkthrough = useWalkthrough(walkthroughSteps);

  return (
    <div className="min-h-screen bg-workspace-gradient" data-testid="chat-page">
      {/* Disabled workspace initialization modal */}
      {/* {(mainThreadStatus.isMainThreadLoading ||
        mainThreadStatus.mainThreadError) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <MainThreadLoader
            isLoading={mainThreadStatus.isMainThreadLoading}
            error={mainThreadStatus.mainThreadError}
            onRetry={mainThreadStatus.retryMainThreadCreation}
            className="shadow-lg"
          />
        </div>
      )} */}

      {/* Left Sidebar - includes Project Context icon and navigation routes */}
      <LoopOpsSidebarLeft />

      {/* Milestones Sidebar - positioned next to left sidebar */}
      <MilestonesSidebar />

      {/* Right Sidebar - includes Mindspace icon only */}
      <LoopOpsSidebarRight
        mindspaceResizeRef={mindspaceResizeRef}
        data-testid="chat-sidebar-right"
      />

      {/* Main Content - positioned between sidebars */}
      <MainChatArea
        inputChatContainerRef={inputChatContainerRef}
        chatHeaderNavigationRef={chatHeaderNavigationRef}
        className="flex flex-col h-[calc(100vh)] pt-[1px] bg-neutral-grayscale-20"
        style={{
          paddingLeft: `${
            leftSidebarWidth +
            (isMilestonesMaximized ? milestonesSidebarWidth : 80)
          }px`,
          paddingRight: `${rightSidebarWidth + 8}px`,
        }}
        data-testid="main-chat-area-container"
      />

      {/* Universal Dialog for EditAgents */}
      <UniversalDialog
        title="Teams Configuration"
        showLogo={true}
        fullScreen={true}
        allowChildControl={false}
        data-testid="chat-teams-dialog"
      >
        <div className="p-loop-8" data-testid="chat-teams-dialog-content">
          DEFAULT CONTENT
        </div>
      </UniversalDialog>

      {/* Walkthrough System */}
      {!walkthroughCompleted && !walkthrough.isActive && (
        <WalkthroughOverlay
          title="🤖 Welcome to Loop Ops Chat"
          description="You're about to start the 1st Stage of your project. Wanna learn how this screen works first?"
          isVisible={true}
          secondaryButton={{
            title: 'Skip Tour',
            action: handleSkipToFinalStep,
          }}
          primaryButton={{
            title: 'Yes, show me',
            // action: handleSkipToFinalStep,
            action: () => walkthrough.startWalkthrough(),
          }}
          data-testid="chat-walkthrough-overlay"
        />
      )}

      {/* Walkthrough Step Info */}
      {walkthrough.isActive && walkthrough.currentStep && (
        <WalkthroughInfo
          title={walkthrough.currentStep.title}
          description={walkthrough.currentStep.description}
          targetRef={walkthrough.currentStep.targetRef}
          placement={walkthrough.currentStep.placement}
          offset={walkthrough.currentStep.offset}
          centered={walkthrough.currentStep.centered}
          primaryButton={walkthrough.currentStep.primaryButton}
          secondaryButton={walkthrough.currentStep.secondaryButton}
          iconSection={walkthrough.currentStep.iconSection}
          className={walkthrough.currentStep.className}
          animation={walkthrough.currentStep.animation}
          trigger={walkthrough.currentStep.trigger}
          data-testid="chat-walkthrough-info"
        />
      )}
    </div>
  );
};

const Index = () => {
  return (
    <SessionProvider>
      <SidebarWidthProvider>
        <ChatControllerProvider>
          <DialogControlProvider>
            <MainContent />
          </DialogControlProvider>
        </ChatControllerProvider>
      </SidebarWidthProvider>
    </SessionProvider>
  );
};

export default Index;
