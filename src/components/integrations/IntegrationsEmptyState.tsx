import { Database, Plug } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
  type: 'knowledge-base' | 'integrations';
}

export const IntegrationsEmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const content = {
    'knowledge-base': {
      icon: Database,
      title: 'No knowledge base items yet',
      description:
        'Start adding documents and files to build your knowledge base',
    },
    integrations: {
      icon: Plug,
      title: 'No integrations connected',
      description: 'Connect your tools to enhance your workflow',
    },
  };

  const { icon: Icon, title, description } = content[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-12 h-loop-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-[#EEEEEE] flex items-center justify-center mb-3 sm:mb-3.5 lg:mb-4">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#666666]" />
      </div>
      <h3 className="font-bold text-[16px] sm:text-[17px] lg:text-[18px] text-[#0F0F0F] mb-2">
        {title}
      </h3>
      <p className="font-normal text-[13px] sm:text-[13.5px] lg:text-[14px] text-[#666666] text-center max-w-[280px] sm:max-w-sm lg:max-w-md">
        {description}
      </p>
    </div>
  );
};
