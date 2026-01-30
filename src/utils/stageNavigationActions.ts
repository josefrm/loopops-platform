import { MessageAction } from '@/models/Message';

const STAGE_NAVIGATION_PATTERNS = [
  /move to the next phase/i,
  /start the .+ phase/i,
  /proceed to the .+ phase/i,
  /ready to (start|move to|proceed to) .+ phase/i,
  /move (to|into) the .+ stage/i,
  /transition to .+ (stage|phase)/i,
];

export const extractStageNameFromLabel = (label: string): string | null => {
  // Pattern: "Proceed to [Stage Name]"
  const proceedToMatch = label.match(/proceed to (.+)/i);
  if (proceedToMatch) {
    return proceedToMatch[1].trim();
  }

  const goToMatch = label.match(/go to (.+)/i);
  if (goToMatch) {
    return goToMatch[1].trim();
  }

  const navigateToMatch = label.match(/navigate to (.+)/i);
  if (navigateToMatch) {
    return navigateToMatch[1].trim();
  }

  const startMatch = label.match(/start (.+)/i);
  if (startMatch) {
    return startMatch[1].trim();
  }

  return null;
};

export const extractStageNameFromPrompt = (prompt: string): string | null => {
  const phaseMatch = prompt.match(/(?:start|proceed to|move (?:to|into)|ready to (?:start|move to|proceed to))\s+(?:the\s+)?([^.]+?)\s+(?:phase|stage)/i);
  if (phaseMatch) {
    return phaseMatch[1].trim();
  }

  return null;
};

export const isStageNavigationAction = (action: MessageAction): boolean => {
  if (!action.label) {
    return false;
  }

  const stageNameFromLabel = extractStageNameFromLabel(action.label);
  if (stageNameFromLabel) {
    if (action.prompt) {
      const hasNavigationPattern = STAGE_NAVIGATION_PATTERNS.some(
        pattern => pattern.test(action.prompt!)
      );
      
      if (hasNavigationPattern) {
        return true;
      }
      
      const stageNameFromPrompt = extractStageNameFromPrompt(action.prompt);
      if (stageNameFromPrompt) {
        return true;
      }
    }
  }

  return false;
};

export const getTargetStageName = (action: MessageAction): string | null => {
  if (!isStageNavigationAction(action)) {
    return null;
  }

  let stageName = extractStageNameFromLabel(action.label);
  
  if (!stageName && action.prompt) {
    stageName = extractStageNameFromPrompt(action.prompt);
  }

  return stageName;
};

export const filterActionsForStageNavigation = (
  actions: MessageAction[],
  stepFinished: boolean = false
): MessageAction[] => {
  if (!actions || actions.length === 0) {
    return actions;
  }

  if (!stepFinished) {
    return actions;
  }

  const navigationAction = actions.find(isStageNavigationAction);

  if (navigationAction) {
    return [navigationAction];
  }

  return actions;
};
