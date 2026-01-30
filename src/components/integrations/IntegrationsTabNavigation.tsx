import React from 'react';
import { useIntegrationsStore } from '@/stores/integrationsStore';

interface IntegrationsTabNavigationProps {
  className?: string;
}

export const IntegrationsTabNavigation: React.FC<IntegrationsTabNavigationProps> = ({ className = '' }) => {
  const { activeTab, setActiveTab } = useIntegrationsStore();

  const tabs = [
    { id: 'knowledge-base' as const, name: 'Knowledge Base' },
    { id: 'integrations' as const, name: 'Integrations' },
  ];

  return (
    <div className={`flex w-full ${className}`}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="flex flex-col items-center cursor-pointer flex-1 gap-1.5 sm:gap-2"
          onClick={() => setActiveTab(tab.id)}
        >
          <p
            className={`text-[14px] sm:text-[15px] lg:text-[16px] leading-normal tracking-[-0.48px] text-[#0F0F0F] text-center transition-all duration-200 ${
              activeTab === tab.id ? 'font-bold' : 'font-normal hover:font-semibold'
            }`}
          >
            {tab.name}
          </p>
          <div
            className="transition-all duration-300 ease-in-out w-full"
            style={{
              height: activeTab === tab.id ? '3px' : '1px',
              marginTop: activeTab === tab.id ? '0px' : '2px',
              backgroundColor: activeTab === tab.id ? '#0F0F0F' : '#999999',
            }}
          />
        </div>
      ))}
    </div>
  );
};
