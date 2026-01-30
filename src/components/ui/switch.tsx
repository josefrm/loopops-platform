import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  backgroundColor?: string;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, checked, backgroundColor, style, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'space-x-[3px] peer inline-flex h-[24px] w-[60px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input relative',
      className,
    )}
    style={{
      ...(backgroundColor && checked && { backgroundColor }),
      ...style,
    }}
    checked={checked}
    {...props}
    ref={ref}
  >
    {/* ON Text - visible when checked */}
    <span
      className={`absolute left-2 text-white font-normal text-sm transition-opacity pointer-events-none z-10 select-none ${
        checked ? 'opacity-100' : 'opacity-0'
      }`}
    >
      ON
    </span>

    {/* OFF Text - visible when unchecked */}
    <span
      className={`absolute right-1.5 text-black font-normal text-sm transition-opacity pointer-events-none z-10 select-none ${
        checked ? 'opacity-0' : 'opacity-100'
      }`}
    >
      OFF
    </span>

    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-[18px] w-[18px] rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-8 data-[state=unchecked]:translate-x-0 z-20 relative',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
