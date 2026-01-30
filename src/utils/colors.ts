// Color system for LoopOps application

// Element Colors
export const elementColors = {
  1: '#306EE1',
  2: '#40AD82',
  3: '#DD9B25',
  4: '#E7823F',
  5: '#D856A8',
} as const;

// Main Button Color
export const mainButtonColor = '#BE47B4';

// Brand Gradient Colors
export const brandGradientColors = {
  start: '#2E9BA7',
  mid1: '#2E60A7',
  mid2: '#4A2EA7',
  end: '#9D2EA7',
} as const;

// Agent Gradient Colors
export const agentGradientColors = {
  red: '#F55577',
  orange: '#F9BA34',
  teal: '#3DC1A9',
  blue: '#3B8AC5',
  purple: '#9153C1',
  pink: '#F55A74',
} as const;

// Agent Colors (1-12)
export const agentColors = {
  1: '#9C3698',
  2: '#8B5AD0',
  3: '#5D6DDE',
  4: '#347ECF',
  5: '#3498AA',
  6: '#39AEAE',
  7: '#49A97F',
  8: '#EEAA37',
  9: '#BEB342',
  10: '#F7834A',
  11: '#F7834A',
  12: '#EF4E8A',
} as const;

// Primary Colors
export const primaryColors = {
  default: '#D8622B',
  light: '#E6803F',
  dark: '#C4561F',
} as const;

// Project Context Colors
export const projectContextColors = {
  background: '#F2F2D9', // Project context background
} as const;

// Gray Scale
export const grayColors = {
  900: '#333333',
  700: '#666666',
  600: '#999999',
  500: '#CCCCCC',
  400: '#E5E5E5',
  300: '#F0F0F0',
  200: '#F5F5F5',
  100: '#FAFAFA',
} as const;

// Gradients
export const gradients = {
  brand:
    'linear-gradient(90deg, #2E9BA7 0%, #2E60A7 38.95%, #4A2EA7 68.75%, #9D2EA7 100%)',
  agent:
    'conic-gradient(from 180deg at 50% 50%, #F55577 0deg, #F9BA34 67.5deg, #3DC1A9 152.3deg, #3B8AC5 218.1deg, #9153C1 290.8deg, #F55A74 346.2deg)',
  workspace:
    'linear-gradient(107deg, #C8ECF6 18.58%, #E9F4F8 38.46%, #EEFEFA 67.31%, #FFF9EF 93.75%)',
  premiumLinearGradient:
    'linear-gradient(90deg, #FFC842 0%, #FF7CA3 25.49%, #DF86FF 49.06%, #75FFA2 76%, #48ECFF 100.05%)',
  blackGradient: '#0F0F0F',
  allAgentsBackgroundGradient:
    'linear-gradient(107deg, #48211F 0%, #3F2E0D 5.77%, #3F451C 11.44%, #16453E 18.35%, #113238 24.99%, var(--Gray-7, #0F0F0F) 46.41%)',
} as const;

// Tailwind class helpers
export const tailwindColors = {
  element: {
    1: 'bg-element-1 text-white',
    2: 'bg-element-2 text-white',
    3: 'bg-element-3 text-white',
    4: 'bg-element-4 text-white',
    5: 'bg-element-5 text-white',
  },
  mainButton: 'bg-brand-accent-50 hover:bg-brand-accent-50/90 text-white',
  brand: 'bg-brand hover:bg-brand-light text-white',
} as const;

// CSS-in-JS style objects
export const styleObjects = {
  brandGradient: {
    background: gradients.brand,
  },
  agentGradient: {
    background: gradients.agent,
  },
  workspaceGradient: {
    background: gradients.workspace,
  },
  premiumLinearGradient: {
    background: gradients.premiumLinearGradient,
  },
  blackGradient: {
    background: gradients.blackGradient,
  },
  allAgentsBackgroundGradient: {
    background: gradients.allAgentsBackgroundGradient,
  },
  brandGradientText: {
    background: gradients.brand,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  mainButton: {
    backgroundColor: mainButtonColor,
  },
  elements: {
    1: { backgroundColor: elementColors[1] },
    2: { backgroundColor: elementColors[2] },
    3: { backgroundColor: elementColors[3] },
    4: { backgroundColor: elementColors[4] },
    5: { backgroundColor: elementColors[5] },
  },
  agents: {
    1: { backgroundColor: agentColors[1] },
    2: { backgroundColor: agentColors[2] },
    3: { backgroundColor: agentColors[3] },
    4: { backgroundColor: agentColors[4] },
    5: { backgroundColor: agentColors[5] },
    6: { backgroundColor: agentColors[6] },
    7: { backgroundColor: agentColors[7] },
    8: { backgroundColor: agentColors[8] },
    9: { backgroundColor: agentColors[9] },
    10: { backgroundColor: agentColors[10] },
    11: { backgroundColor: agentColors[11] },
    12: { backgroundColor: agentColors[12] },
  },
  projectContext: {
    background: { backgroundColor: projectContextColors.background },
  },
} as const;

// Utility functions
export const getElementColor = (element: 1 | 2 | 3 | 4 | 5): string => {
  return elementColors[element];
};

export const getElementTailwindClass = (element: 1 | 2 | 3 | 4 | 5): string => {
  return tailwindColors.element[element];
};

export const getAgentColor = (
  agentNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
): string => {
  return agentColors[agentNumber];
};

export const getBrandGradientStyle = () => styleObjects.brandGradient;
export const getAgentGradientStyle = () => styleObjects.agentGradient;
export const getWorkspaceGradientStyle = () => styleObjects.workspaceGradient;
export const getPremiumLinearGradientStyle = () =>
  styleObjects.premiumLinearGradient;
export const getBlackGradientStyle = () => styleObjects.blackGradient;
export const getAllAgentsBackgroundStyle = () =>
  styleObjects.allAgentsBackgroundGradient;
export const getMainButtonStyle = () => styleObjects.mainButton;
export const getAgentStyle = (
  agentNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
) => styleObjects.agents[agentNumber];
