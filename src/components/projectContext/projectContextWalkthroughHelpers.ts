import { WalkthroughStep } from '@/hooks/useWalkthrough';

interface WalkthroughRefs {
  settingsButtonRef: React.RefObject<HTMLDivElement>;
  tabNavigationRef: React.RefObject<HTMLDivElement>;
  stageActionsRef: React.RefObject<HTMLDivElement>;
  fileViewerRef: React.RefObject<HTMLDivElement>;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

interface WalkthroughHandlers {
  onNextStep: () => void;
  onSkipWalkthrough: () => void;
  onFinishWalkthrough: () => void;
  onSkipToFinalStep: () => void;
}

export const createProjectContextWalkthroughSteps = (
  refs: WalkthroughRefs,
  handlers: WalkthroughHandlers,
): WalkthroughStep[] => {
  const {
    settingsButtonRef,
    tabNavigationRef,
    stageActionsRef,
    fileViewerRef,
    sidebarRef,
  } = refs;
  const { onNextStep } = handlers;

  return [
    {
      id: 'settings',
      title: 'Workspace & Project',
      description:
        'In this top area you can view, configure, or switch between your current workspace and projects.',
      targetRef: settingsButtonRef,
      placement: 'bottom-start',
      offset: { y: 10 },
      primaryButton: {
        title: 'Next',
        action: onNextStep,
      },
    },
    {
      id: 'project-stages',
      title: 'Project Stages',
      description:
        "These five tabs represent your project stages. Below each one, you'll find its deliverables, files, and loops.",
      targetRef: tabNavigationRef,
      placement: 'bottom-start',
      offset: { y: -10 },
      primaryButton: {
        title: 'Tell me more',
        action: onNextStep,
      },
    },
    {
      id: 'deliverables',
      title: 'Deliverables, Files, and Loops',
      description: `Deliverables are key documents created in LoopOps to move your project through each stage.

Files provide the context and resources needed to produce those deliverables.

Loops are your guided conversations with AI agents that support you throughout the SDLC.`,
      targetRef: stageActionsRef,
      placement: 'bottom-start',
      offset: { y: 10 },
      primaryButton: {
        title: 'Ok, got it!',
        action: onNextStep,
      },
    },
    {
      id: 'file-viewer',
      title: 'File Viewer & Editor',
      description: `When you select a file, deliverable or loop from the left, in this yellow area you will preview that element here and also be able to perform some actions.

And in this same area you also will receive advices from LoopOps to move forward with your project.`,
      targetRef: fileViewerRef,
      placement: 'inside-top-left-corner',
      // offset: { y: -250, x: -35 },
      primaryButton: {
        title: "That's awesome",
        action: onNextStep,
      },
      className: 'w-[460px]',
    },
    {
      id: 'chat-mindspace',
      title: 'Chat and Mindspace',
      description: `Access the main Chat and your Mindspace from the icons at the right, to collaborate and explore ideas.`,
      targetRef: sidebarRef,
      placement: 'left-start',
      offset: { x: 10, y: 10 },
      primaryButton: {
        title: 'Ok, show me more',
        action: onNextStep,
      },
    },
    {
      id: 'final-step',
      title: 'Start your first stage',
      description: `Begin the onboarding stage by adding key documents. Click the button above when you're ready to start.`,
      targetRef: fileViewerRef,
      placement: 'bottom',
      offset: { x: 0, y: 10 },
      className: 'w-[460px]',
      animation: 'jump',
    },
  ];
};
