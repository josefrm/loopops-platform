import {
  WalkthroughButton,
  WalkthroughIconSection,
} from '@/components/walkthrough/WalkthroughInfo';
import { useCallback, useState } from 'react';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetRef?: React.RefObject<HTMLElement>;
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'inside-top-left-corner'
    | 'top-start'
    | 'bottom-start'
    | 'left-start'
    | 'right-start';
  offset?: { x?: number; y?: number };
  centered?: boolean;
  primaryButton?: WalkthroughButton;
  secondaryButton?: WalkthroughButton;
  iconSection?: WalkthroughIconSection;
  onShow?: () => void;
  onHide?: () => void;
  className?: string;
  animation?: 'bounce' | 'pulse' | 'jump' | 'none';
  trigger?: any;
}

export const useWalkthrough = (steps: WalkthroughStep[]) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  const startWalkthrough = useCallback(() => {
    if (steps.length > 0) {
      setCurrentStepIndex(0);
      setIsActive(true);
      steps[0].onShow?.();
    }
  }, [steps]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      currentStep?.onHide?.();
      setCurrentStepIndex(nextIndex);
      steps[nextIndex].onShow?.();
    } else {
      // End of walkthrough
      setIsActive(false);
      setCurrentStepIndex(-1);
      currentStep?.onHide?.();
    }
  }, [currentStepIndex, steps, currentStep]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      currentStep?.onHide?.();
      setCurrentStepIndex(prevIndex);
      steps[prevIndex].onShow?.();
    }
  }, [currentStepIndex, steps, currentStep]);

  const skipWalkthrough = useCallback(() => {
    currentStep?.onHide?.();
    setIsActive(false);
    setCurrentStepIndex(-1);
  }, [currentStep]);

  const skipToFinalStep = useCallback(() => {
    // Jump to the last step in the walkthrough
    if (steps.length > 0) {
      const finalStepIndex = steps.length - 1;
      currentStep?.onHide?.();
      setCurrentStepIndex(finalStepIndex);
      setIsActive(true);
      steps[finalStepIndex].onShow?.();
    }
  }, [steps, currentStep]);

  const goToStep = useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex((step) => step.id === stepId);
      if (stepIndex >= 0) {
        currentStep?.onHide?.();
        setCurrentStepIndex(stepIndex);
        setIsActive(true);
        steps[stepIndex].onShow?.();
      }
    },
    [steps, currentStep],
  );

  return {
    currentStep,
    currentStepIndex,
    isActive,
    totalSteps: steps.length,
    startWalkthrough,
    nextStep,
    previousStep,
    skipWalkthrough,
    skipToFinalStep,
    goToStep,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
  };
};
