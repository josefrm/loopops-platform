import { WalkthroughStep } from '@/hooks/useWalkthrough';
import { useChatViewStore } from '@/stores/chatViewStore';
import { useSidebarLeftViewStore } from '@/stores/sidebarLeftViewStore';
import { useSidebarRightViewStore } from '@/stores/sidebarRightViewStore';
import { AtSign, Maximize2, Minimize2 } from 'lucide-react';
import React from 'react';

interface IndexWalkthroughRefs {
  mindspaceResizeRef: React.RefObject<HTMLDivElement>;
  chatHeaderNavigationRef: React.RefObject<HTMLDivElement>;
  inputChatContainerRef: React.RefObject<HTMLTextAreaElement>;
  projectContextResizeRef: React.RefObject<HTMLDivElement>;
}

interface IndexWalkthroughHandlers {
  onNextStep: () => void;
  onSkipWalkthrough: () => void;
  onFinishWalkthrough: () => void;
  onSkipToFinalStep: () => void;
}

export const useIndexWalkthroughSteps = (
  refs: IndexWalkthroughRefs,
  handlers: IndexWalkthroughHandlers,
): WalkthroughStep[] => {
  const {
    inputChatContainerRef,
    mindspaceResizeRef,
    chatHeaderNavigationRef,
    projectContextResizeRef,
  } = refs;
  const { onNextStep, onFinishWalkthrough } = handlers;
  const { toggleMaximize, isMaximized } = useChatViewStore();
  const {
    toggleMaximize: toggleRightSidebarMaximize,
    isMaximized: isRightSidebarMaximized,
  } = useSidebarRightViewStore();
  const {
    toggleMaximize: toggleLeftSidebarMaximize,
    isMaximized: isLeftSidebarMaximized,
  } = useSidebarLeftViewStore();

  return [
    {
      id: 'step-1',
      title: "First, the chat's top section",
      description:
        "In this area, you'll see the agents you'll interact with and the loop you're currently in.",
      targetRef: chatHeaderNavigationRef,
      placement: 'bottom',
      offset: { x: 200 },
      iconSection: {
        icon: !isMaximized
          ? React.createElement(Minimize2)
          : React.createElement(Maximize2),
        text: 'Use this icon to expand or collapse this section whenever you prefer.',
        action: () => {
          toggleMaximize();
        },
      },
      primaryButton: {
        title: !isMaximized ? 'Show me' : 'Got it, next',
        action: () => {
          if (!isMaximized) {
            toggleMaximize();
          } else {
            toggleMaximize();
            onNextStep();
          }
        },
      },
    },
    {
      id: 'step-2',
      title: "Now, the chat's message input",
      description:
        'Use this area just like a regular chat: talk with the agents above, attach files, or switch to voice mode if you prefer.',
      targetRef: inputChatContainerRef,
      placement: 'top',
      offset: { x: 0, y: 20 },
      primaryButton: {
        title: "It's clear",
        action: onNextStep,
      },
      iconSection: {
        icon: React.createElement(AtSign),
        text: ' Use @ to mention a specific agent from the team above and talk directly with them.',
        action: () => console.log('Icon clicked!'),
      },
    },
    {
      id: 'step-3',
      title: 'Now, the right panel',
      description:
        'In this panel, you can access your Mindspace and view the latest saved files you have in there. You can drag these files into the chat to work with them.',
      targetRef: mindspaceResizeRef,
      placement: 'left',
      offset: { x: 20, y: 100 },
      trigger: isRightSidebarMaximized,
      iconSection: {
        icon: isRightSidebarMaximized
          ? React.createElement(Minimize2)
          : React.createElement(Maximize2),
        text: 'Use this icon to expand or collapse this section whenever you prefer.',
        action: () => {
          console.log('Icon clicked!');
          toggleRightSidebarMaximize();
        },
      },
      primaryButton: {
        title: !isRightSidebarMaximized ? 'Show me' : 'Got it, next',
        action: () => {
          console.log('Primary Button clicked!', isRightSidebarMaximized);
          if (!isRightSidebarMaximized) {
            toggleRightSidebarMaximize();
          } else {
            toggleRightSidebarMaximize();
            onNextStep();
          }
        },
      },
    },
    {
      id: 'step-4',
      title: 'Finally, the left panel',
      description:
        'In this panel, you can access your Project Context (Workspace) and view the milestones of the chat’s active loop. Milestones let you jump back to any specific moment in the chat.',
      targetRef: projectContextResizeRef,
      placement: 'right',
      offset: { x: 50, y: 100 },
      trigger: isLeftSidebarMaximized,
      iconSection: {
        icon: isLeftSidebarMaximized
          ? React.createElement(Minimize2)
          : React.createElement(Maximize2),
        text: 'Use this icon to expand or collapse the panel whenever you prefer.',
        action: () => {
          console.log('Icon clicked!');
          toggleLeftSidebarMaximize();
        },
      },
      primaryButton: {
        title: !isLeftSidebarMaximized ? 'Show me' : 'Got it, next',
        action: () => {
          if (!isLeftSidebarMaximized) {
            toggleLeftSidebarMaximize();
          } else {
            toggleLeftSidebarMaximize();
            onFinishWalkthrough();
          }
        },
      },
    },
  ];
};
