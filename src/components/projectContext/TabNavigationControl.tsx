import React from 'react';

export interface Stage {
  id: number;
  name: string;
  priority: number;
  project_stage_id?: string;
  team_id?: string;
  template_id?: string;
}

export type TabType = 'assets' | 'artifacts';

interface TabNavigationControlProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}

export const TabNavigationControl: React.FC<TabNavigationControlProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'artifacts', label: 'Project Artifacts' },
    { id: 'assets', label: 'Uploaded Project Assets' },
  ];

  return (
    <div className={`flex w-full ${className} space-x-loop-2`}>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className="flex flex-col items-center cursor-pointer"
          onClick={() => onTabChange(tab.id)}
          style={{ width: index === 0 ? '70%' : '30%' }}
        >
          <span
            className={`text-base font-medium transition-colors duration-200 text-brand-accent-50 truncate w-full text-center ${
              activeTab === tab.id ? 'font-bold' : 'hover:font-bold'
            }`}
          >
            {tab.label}
          </span>
          {/* Tab indicator bar - changes color from gray to pink */}
          <div
            className="mt-loop-2 transition-all duration-300 ease-in-out w-full"
            style={{
              height: activeTab === tab.id ? '4px' : '1px',
              // marginTop: activeTab === tab.id ? '0px' : '3px',
              backgroundColor:
                activeTab === tab.id
                  ? 'var(--brand-accent-50)'
                  : 'var(--neutral-grayscale-40)',
            }}
          />
        </div>
      ))}
    </div>
  );
};
