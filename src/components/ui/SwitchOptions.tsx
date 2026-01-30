import React from 'react';
import { Switch } from '@/components/ui/switch';

interface SwitchOption {
  id: string;
  label: string;
  checked: boolean;
}

interface SwitchOptionsProps {
  options: SwitchOption[];
  onToggle: (id: string, checked: boolean) => void;
  switchColor?: string;
  className?: string;
  backgroundColor?: string;
}

export const SwitchOptions: React.FC<SwitchOptionsProps> = ({
  options,
  onToggle,
  switchColor = 'bg-blue-600',
  className = '',
  backgroundColor = '#3B82F6',
}) => {
  return (
    <div className={`space-y-loop-4 ${className}`}>
      {options.map((option) => (
        <div key={option.id} className="flex items-center space-x-loop-2">
          <Switch
            checked={option.checked}
            onCheckedChange={(checked) => onToggle(option.id, checked)}
            className={`data-[state=checked]:${switchColor}`}
            backgroundColor={backgroundColor}
          />
          <span className="text-base text-white ml-[12px]">{option.label}</span>
        </div>
      ))}
    </div>
  );
};
