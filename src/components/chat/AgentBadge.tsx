import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface AgentBadgeProps {
  agentName?: string;
  teamName?: string;
  agentType?: string;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ 
  agentName, 
  teamName, 
  agentType 
}) => {
  const displayName = agentName || teamName || agentType || 'Agent';
  const showSparkles = agentType !== 'system';

  return (
    <div className="mb-1 flex items-center space-x-2">
      <Badge variant="outline" className="text-sm">
        {displayName}
      </Badge>
      {showSparkles && <Sparkles className="w-3 h-3 text-purple-500" />}
    </div>
  );
};
