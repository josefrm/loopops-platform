import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ControlIcon, ControlIconType } from '../ui/ControlIcon';
import { HouseIcon } from 'lucide-react';

interface LoopOpsSidebarProps {
  className?: string;
  position?: 'left' | 'right';
}

export const LoopOpsSidebar: React.FC<LoopOpsSidebarProps> = ({
  className,
  position = 'left',
}) => {
  const location = useLocation();

  const sidebarItems = [
    {
      to: '/mindspace',
      icon: <HouseIcon fill="var(--neutral-grayscale-0)" width={24} />,
      label: 'Mindspace',
      type: 'filter',
      active: location.pathname === '/mindspace',
      onClick: () => console.log('Mindspace clicked'),
    },
    // {
    //   to: '/',
    //   icon: <Home size={20} />,
    //   label: 'Home',
    //   active: location.pathname === '/',
    //   type: 'configuration',
    //   onClick: () => console.log('Home clicked'),
    // },
  ];

  return (
    <div
      className={cn(
        'fixed top-0 h-full w-20 bg-white border-neutral-grayscale-20 z-10 flex flex-col p-loop-4 space-y-loop-5',
        position === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        className,
      )}
    >
      {/* Logo or brand area */}
      <div className="h-loop-12 flex items-center justify-center">
        <Link
          to="/"
          className="transition-opacity hover:opacity-80 cursor-pointer"
        >
          <img
            src="/lovable-uploads/loop_ops_small.png"
            alt="LoopOps"
            width={32}
            height={32}
            className="object-contain"
          />
        </Link>
        {/* <span className="text-white font-bold text-sm">L</span> */}
      </div>

      {/* small bar width 48px var color corresponding to #DBDBDB */}
      <div className="w-loop-12 h-[1px] bg-neutral-grayscale-30 mx-auto" />

      {/* Navigation items */}
      <div className="flex flex-col items-center space-y-loop-5 flex-1">
        {sidebarItems.map((item, index) => (
          <ControlIcon
            key={index}
            to={item.to}
            icon={item.icon}
            label={item.label}
            type={item.type as ControlIconType}
            active={item.active}
            onClick={item?.onClick}
          />
        ))}
      </div>

      {/* Bottom section */}
      {/* <div className="flex items-center justify-center pb-4">
        <SidebarItem
          icon={<User size={20} />}
          label="Profile"
          onClick={() => console.log('Profile clicked')}
        />
      </div> */}
    </div>
  );
};
