import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PencilIcon } from '@/components/ui/icons/PencilIcon';
import { AgentTeamManagement } from './AgentTeamManagement';
import { useDialogControl } from '@/contexts/DialogControlContext';

interface EditAgentsProps {
  className?: string;
  selectedAgent?: any; // Agent from AgentDetail context
}

// Trigger component with edit icon
export const EditAgents: React.FC<EditAgentsProps> = ({ className = '' }) => {
  const { openDialogWithChildren } = useDialogControl();
  const onEdit = () => {
    openDialogWithChildren(<AgentTeamManagement />);
  };
  return (
    <Avatar
      className={`w-11 h-11 shadow-sm cursor-pointer ${className}`}
      style={{
        marginLeft: '0.5rem',
      }}
      onClick={onEdit}
    >
      <AvatarFallback className="bg-white text-brand-accent-50">
        <PencilIcon width={24} height={24} />
      </AvatarFallback>
    </Avatar>
  );
};
