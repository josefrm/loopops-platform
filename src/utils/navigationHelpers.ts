import { ChatTab } from '@/stores/chatStore';

interface NavigationContext {
  searchParams: URLSearchParams;
  activeTab?: ChatTab;
  currentStageId?: number; // For ProjectContext
}

const getRelevantParams = (
  targetPath: string,
  context: NavigationContext
): URLSearchParams => {
  const params = new URLSearchParams();
  const { searchParams, activeTab, currentStageId } = context;
  
  const stageParam = searchParams.get('stage');
  const sessionIdParam = searchParams.get('session_id');

  switch (targetPath) {
    case '/':
      if (currentStageId != null) {
        params.set('stage', currentStageId.toString());
      } else if (stageParam) {
        params.set('stage', stageParam);
      } else if (activeTab?.stageId != null) {
        params.set('stage', activeTab.stageId.toString());
      }
      break;

    case '/chat':
      if (stageParam) {
        params.set('stage', stageParam);
      } else if (currentStageId != null) {
        params.set('stage', currentStageId.toString());
      } else if (activeTab?.stageId != null) {
        params.set('stage', activeTab.stageId.toString());
      }

      if (sessionIdParam) {
        params.set('session_id', sessionIdParam);
      } else if (activeTab?.sessionId) {
        params.set('session_id', activeTab.sessionId);
      }
      break;

    case '/mindspace':
      if (stageParam) {
        params.set('stage', stageParam);
      } else if (activeTab?.stageId != null) {
        params.set('stage', activeTab.stageId.toString());
      }
      
      if (sessionIdParam) {
        params.set('session_id', sessionIdParam);
      } else if (activeTab?.sessionId) {
        params.set('session_id', activeTab.sessionId);
      }
      break;

    default:
      if (stageParam || activeTab?.stageId != null) {
        params.set('stage', stageParam || activeTab!.stageId!.toString());
      }
      if (sessionIdParam || activeTab?.sessionId) {
        params.set('session_id', sessionIdParam || activeTab!.sessionId!);
      }
  }

  return params;
};

export const buildNavigationUrl = (
  basePath: string,
  context: NavigationContext
): string => {
  const params = getRelevantParams(basePath, context);
  return params.toString() ? `${basePath}?${params.toString()}` : basePath;
};

export const updateStageInUrl = (
  stageId: number,
  navigate: (path: string, options?: any) => void,
  searchParams: URLSearchParams
) => {
  const params = new URLSearchParams(searchParams);
  params.set('stage', stageId.toString());
  navigate(`?${params.toString()}`, { replace: true });
};
