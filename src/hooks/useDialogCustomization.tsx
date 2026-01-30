import { useDialogControl } from '@/contexts/DialogControlContext';
import {
  getBrandGradientStyle,
  getAgentGradientStyle,
  getWorkspaceGradientStyle,
  getPremiumLinearGradientStyle,
  getBlackGradientStyle,
  getAllAgentsBackgroundStyle,
} from '@/utils/colors';

export type GradientType =
  | 'brand'
  | 'agent'
  | 'workspace'
  | 'premium'
  | 'black'
  | 'custom'
  | 'all-agents';

interface UseDialogCustomizationReturn {
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setGradient: (type: GradientType, customStyle?: React.CSSProperties) => void;
  setTitleStyle: (style: React.CSSProperties) => void; // Add title style setter
  setCloseStyle: (style: React.CSSProperties) => void; // Add close style setter
  setHeaderBackground: (style: React.CSSProperties) => void; // Add header background setter
  resetBackground: () => void;
}

export const useDialogCustomization = (): UseDialogCustomizationReturn => {
  const {
    setDialogTitle,
    setDialogSubtitle,
    setDialogBackgroundStyle,
    setDialogTitleStyle,
    setDialogCloseStyle,
    setDialogHeaderBackgroundStyle,
    resetDialogBackground,
  } = useDialogControl();

  const setTitle = (title: string) => {
    setDialogTitle(title);
  };

  const setSubtitle = (subtitle: string) => {
    setDialogSubtitle(subtitle);
  };

  const setGradient = (
    type: GradientType,
    customStyle?: React.CSSProperties,
  ) => {
    switch (type) {
      case 'brand':
        setDialogBackgroundStyle(getBrandGradientStyle());
        break;
      case 'agent':
        setDialogBackgroundStyle(getAgentGradientStyle());
        break;
      case 'workspace':
        setDialogBackgroundStyle(getWorkspaceGradientStyle());
        break;
      case 'premium':
        setDialogBackgroundStyle(getPremiumLinearGradientStyle());
        break;
      case 'black':
        setDialogBackgroundStyle(getBlackGradientStyle());
        break;
      case 'all-agents':
        setDialogBackgroundStyle(getAllAgentsBackgroundStyle());
        break;
      case 'custom':
        if (customStyle) {
          setDialogBackgroundStyle(customStyle);
        }
        break;
      default:
        resetDialogBackground();
    }
  };

  const setTitleStyle = (style: React.CSSProperties) => {
    setDialogTitleStyle(style);
  };

  const setCloseStyle = (style: React.CSSProperties) => {
    setDialogCloseStyle(style);
  };

  const setHeaderBackground = (style: React.CSSProperties) => {
    setDialogHeaderBackgroundStyle(style);
  };

  const resetBackground = () => {
    resetDialogBackground();
  };

  return {
    setTitle,
    setSubtitle,
    setGradient,
    setTitleStyle,
    setCloseStyle,
    setHeaderBackground,
    resetBackground,
  };
};
