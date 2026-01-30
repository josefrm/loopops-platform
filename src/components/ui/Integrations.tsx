import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from './ConnectionStatus';

interface Integration {
  id: string;
  name: string;
  enabled?: boolean;
  status: 'checking' | 'connected' | 'notConnected';
}

interface IntegrationsProps {
  integrations?: Integration[];
  defaultActiveIntegrations?: string[];
  onActiveIntegrationsChange?: (activeIds: string[]) => void;
  className?: string;
}

const defaultIntegrations: Integration[] = [
  { id: 'jira', name: 'Jira', enabled: true, status: 'connected' },
  { id: 'github', name: 'GitHub', enabled: true, status: 'notConnected' },
  { id: 'figma', name: 'Figma', enabled: true, status: 'notConnected' },
];

export const Integrations: React.FC<IntegrationsProps> = ({
  integrations = defaultIntegrations,
  defaultActiveIntegrations = [],
  onActiveIntegrationsChange,
  className = '',
}) => {
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>(
    defaultActiveIntegrations,
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with default active integrations if none provided
  useEffect(() => {
    if (!isInitialized) {
      // First time initialization
      if (defaultActiveIntegrations.length === 0) {
        // By default, activate all enabled integrations on first load only
        const defaultActive = integrations
          .filter((integration) => integration.enabled)
          .map((integration) => integration.id);
        setActiveIntegrations(defaultActive);
        onActiveIntegrationsChange?.(defaultActive);
      } else {
        // Use provided default values
        setActiveIntegrations(defaultActiveIntegrations);
      }
      setIsInitialized(true);
    } else if (
      defaultActiveIntegrations.length > 0 &&
      JSON.stringify(activeIntegrations) !==
        JSON.stringify(defaultActiveIntegrations)
    ) {
      // Update if defaultActiveIntegrations prop changes (but only after initialization)
      setActiveIntegrations(defaultActiveIntegrations);
    }
  }, [
    integrations,
    defaultActiveIntegrations,
    onActiveIntegrationsChange,
    isInitialized,
    activeIntegrations,
  ]);

  const handleIntegrationToggle = (integrationId: string) => {
    const integration = integrations.find((int) => int.id === integrationId);

    // Only allow toggling if integration is enabled
    if (!integration?.enabled) return;

    setActiveIntegrations((prev) => {
      const isCurrentlyActive = prev.includes(integrationId);
      const newActiveIntegrations = isCurrentlyActive
        ? prev.filter((id) => id !== integrationId)
        : [...prev, integrationId];

      // Notify parent component of changes
      onActiveIntegrationsChange?.(newActiveIntegrations);

      return newActiveIntegrations;
    });
  };

  const getIntegrationClasses = (integration: Integration) => {
    const isActive = activeIntegrations.includes(integration.id);
    const isEnabled = integration.enabled;

    const baseClasses = `
      flex min-h-[24px] px-4 py-1 flex-col justify-center items-start gap-2.5
      rounded-full transition-all duration-200 ease-in-out select-none text-xs font-medium
    `;

    const cursorClass = isEnabled ? 'cursor-pointer' : 'cursor-not-allowed';
    const opacityClass = isEnabled ? 'opacity-100' : 'opacity-50';

    if (isActive && isEnabled) {
      return `${baseClasses} ${cursorClass} ${opacityClass} bg-white text-gray-600 border border-white/30`;
    } else {
      return `${baseClasses} ${cursorClass} ${opacityClass} bg-transparent border border-white/30 text-white/30`;
    }
  };

  return (
    <div className={`flex flex-wrap items-center space-x-loop-2 ${className}`}>
      <h4 className="text-sm font-medium text-white mr-loop-2">Apps</h4>
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className={getIntegrationClasses(integration)}
          onClick={() => handleIntegrationToggle(integration.id)}
          title={
            integration.enabled
              ? `Toggle ${integration.name}`
              : `${integration.name} is not available`
          }
        >
          <span className="flex items-center space-x-1">
            <ConnectionStatus status={integration.status} />
            <span>{integration.name}</span>
          </span>
        </div>
      ))}
    </div>
  );
};
