import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Agent } from '@/models/Agent';
import { getAgentColorOrDefault } from '@/utils/agentUtils';
import React, { useMemo } from 'react';

interface AgentAvatarProps {
  agent: Partial<Agent>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  avatarTextClassName?: string; // New prop for avatar text styling
  index?: number; // For stacked avatars in cards
  children?: React.ReactNode;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  size = 'md',
  className = '',
  avatarClassName = '',
  nameClassName = '',
  avatarTextClassName = '',
  index = 0,
  children,
}) => {
  // Memoize agent properties to prevent unnecessary re-calculations
  const agentName = useMemo<string>(() => {
    if (agent && 'name' in agent) return agent.name;
    return '';
  }, [agent]);

  const agentKey = useMemo(() => {
    if (agent && 'key' in agent) return agent.key || '';
    return '';
  }, [agent]);

  // Memoize the color calculation to prevent unnecessary re-calculations
  const agentColor = useMemo(() => {
    if (!agent) return '#888888';
    if ('color' in agent) return agent.color;
    return getAgentColorOrDefault(agent);
  }, [agent]);

  // Memoize avatar content
  const avatarContent = useMemo(() => {
    return agentKey || agentName.slice(0, 2).toUpperCase();
  }, [agentKey, agentName]);

  // Size configurations
  const sizeConfig = {
    sm: {
      avatar: 'w-loop-6 h-loop-6',
      avatarText: 'text-xs',
      nameText: 'text-md',
      keyText: 'text-md',
      avatarNameSpace: 'space-x-loop-2',
    },
    md: {
      avatar: 'w-10 h-10',
      avatarText: 'text-sm',
      nameText: 'text-base',
      keyText: 'text-sm',
      avatarNameSpace: 'space-x-loop-2',
    },
    lg: {
      avatar: 'w-12 h-loop-10',
      avatarText: 'text-lg',
      nameText: 'text-lg',
      keyText: 'text-sm',
      avatarNameSpace: 'space-x-loop-2',
    },
    xl: {
      avatar: 'w-loop-20 h-loop-20',
      avatarText: 'text-[18px] bold',
      nameText: 'text-base bold text-[#347ECF]',
      keyText: 'text-sm',
      avatarNameSpace: 'space-x-loop-2',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={`flex items-center w-full ${config.avatarNameSpace} ${className}`}
    >
      <Avatar
        className={`${config.avatar} ${avatarClassName} flex-shrink-0`}
        style={{
          marginLeft: index > 0 ? '-12px' : '0',
          zIndex: index,
        }}
      >
        <AvatarFallback
          className={`${config.avatarText} font-bold text-white transition-colors duration-300`}
          style={{
            backgroundColor: agentColor,
          }}
        >
          <span className={`${avatarTextClassName}`}>{avatarContent}</span>
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p
          className={`${config.nameText} truncate ${nameClassName}`}
          style={{
            fontFamily: 'Inter',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal',
          }}
        >
          {agentName} {size === 'xl' && `(@${agentKey})`}
        </p>
        {children && (
          <div className="mt-loop-1 overflow-hidden">{children}</div>
        )}
      </div>
    </div>
  );
};
