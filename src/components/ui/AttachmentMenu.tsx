import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Paperclip, Plus } from 'lucide-react';
import React, { useRef } from 'react';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface AttachmentMenuProps {
  onFileSelect: (files: FileList | null) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  className?: string;
  iconSize?: number;
  menuItems?: MenuItem[];
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  onFileSelect,
  disabled = false,
  accept = '*/*',
  multiple = true,
  className,
  iconSize = 20,
  menuItems,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(event.target.files);
  };

  // Default menu items if none provided
  const defaultMenuItems: MenuItem[] = [
    {
      label: 'Attach',
      icon: <Paperclip size={16} className="mr-loop-2" />,
      onClick: handleAttachClick,
    },
  ];

  const items = menuItems || defaultMenuItems;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        accept={accept}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              'w-loop-10 h-loop-10 bg-transparent rounded-lg flex items-center justify-center cursor-pointer hover:bg-neutral-grayscale-10 transition-all text-neutral-grayscale-60',
              disabled && 'opacity-50 cursor-not-allowed',
              className,
            )}
            title="Attach files"
          >
            <Plus size={iconSize} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="bg-neutral-grayscale-0 rounded-sm shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] p-loop-2"
        >
          {items.map((item, index) => (
            <DropdownMenuItem
              key={index}
              onClick={item.onClick}
              disabled={disabled}
              className="px-loop-2 py-loop-2 text-[13px] rounded-xs text-neutral-grayscale-50 hover:bg-neutral-grayscale-5 cursor-pointer flex items-center"
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
