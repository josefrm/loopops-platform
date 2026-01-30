import { useIntegrationsStore } from '@/stores/integrationsStore';
import React from 'react';
import { IntegrationCard } from './IntegrationCard';
import { IntegrationsEmptyState } from './IntegrationsEmptyState';

export const IntegrationsLayout: React.FC = () => {
  const { integrations } = useIntegrationsStore();

  if (integrations.length === 0) {
    return <IntegrationsEmptyState type="integrations" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          id={integration.id}
          name={integration.name}
          description={integration.description}
          icon={integration.icon}
          connected={integration.connected}
          type={integration.type}
          prompt={integration.prompt}
        />
      ))}
    </div>
  );
};
