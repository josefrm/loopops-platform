import { WalkthroughStep } from '@/hooks/useWalkthrough';
import React from 'react';

interface MindspaceWalkthroughRefs {
  tabContentRef: React.RefObject<HTMLDivElement>;
  uploadSectionRef: React.RefObject<HTMLDivElement>;
  leftSidebarRef: React.RefObject<HTMLDivElement>;
}

interface MindspaceWalkthroughHandlers {
  onNextStep: () => void;
  onFinishWalkthrough: () => void;
}

export const createMindspaceWalkthroughSteps = (
  refs: MindspaceWalkthroughRefs,
  handlers: MindspaceWalkthroughHandlers,
): WalkthroughStep[] => {
  const { tabContentRef, uploadSectionRef, leftSidebarRef } = refs;
  const { onNextStep, onFinishWalkthrough } = handlers;

  return [
    {
      id: 'ms-step-1',
      title: 'Mindspace Folders',
      description: `They help you organize your Mindspace. Use these tabs to navigate, filter, and group your files as your work and ideas evolve.

These are suggested default folders for your files, but you can also create your own anytime to shape this space the way you prefer.
Ok, got it
      `,
      targetRef: tabContentRef,
      placement: 'top-start',
      centered: true,
      offset: { y: -400 },
      primaryButton: {
        title: 'Ok, got it',
        action: onNextStep,
      },
    },
    {
      id: 'ms-step-2',
      title: 'Preview & Edit Area',
      description: `This blue area lets you preview your files, make edits, and access key actions to keep your work moving forward.

When you select a file, it will appear here, and you’ll be able to edit it or perform any related actions for that specific file.`,
      targetRef: uploadSectionRef,
      placement: 'inside-top-left-corner',
      // offset: { y: -230 },
      primaryButton: {
        title: 'Got it, next',
        action: onNextStep,
      },
      className: '!w-[460px]',
    },
    {
      id: 'ms-step-3',
      title: 'Left Panel',
      description:
        'Use the Loop icon to return to the Chat window, and the Home icon to access your Project Context at any time.',
      targetRef: leftSidebarRef,
      placement: 'right-start',
      offset: { y: 10 },
      primaryButton: {
        title: 'Great, let me use my Mindspace!',
        action: onFinishWalkthrough,
      },
    },
  ];
};
