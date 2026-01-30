import { create } from 'zustand';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  type?: 'integration' | 'prompt';
  prompt?: string;
}

interface IntegrationsState {
  integrations: Integration[];
  activeTab: 'knowledge-base' | 'integrations';
  selectedIntegration: Integration | null;
  showConfigModal: boolean;
  setActiveTab: (tab: 'knowledge-base' | 'integrations') => void;
  toggleConnection: (id: string) => void;
  updateIntegration: (id: string) => void;
  openConfigModal: (integration: Integration) => void;
  closeConfigModal: () => void;
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  integrations: [
    {
      id: 'figma',
      name: 'Figma',
      description: 'Import/export files and enable AI document search.',
      icon: 'Figma',
      connected: false,
      type: 'prompt',
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync issues and enable AI project management.',
      icon: 'Jira',
      connected: false,
      type: 'integration',
    },
  ],
  activeTab: 'integrations',
  selectedIntegration: null,
  showConfigModal: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleConnection: (id) =>
    set((state) => ({
      integrations: state.integrations.map((integration) =>
        integration.id === id
          ? { ...integration, connected: !integration.connected }
          : integration,
      ),
    })),
  updateIntegration: (id) => {
    console.log(`Updating integration ${id}`);
  },
  openConfigModal: (integration) =>
    set({ selectedIntegration: integration, showConfigModal: true }),
  closeConfigModal: () =>
    set({ selectedIntegration: null, showConfigModal: false }),
}));
