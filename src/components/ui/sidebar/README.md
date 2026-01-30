# Reusable Sidebar Components

This directory contains reusable sidebar components that provide expandable functionality from either the left or right side of the screen.

## Components

### SidebarLeft

A sidebar that expands from the left side of the screen.

#### Props

- `children`: React.ReactNode - The content to display inside the sidebar
- `defaultWidth`: string (optional, default: 'w-80') - The default width using Tailwind classes
- `expandedWidth`: string (optional, default: 'w-[80vw]') - The expanded width using Tailwind classes
- `className`: string (optional) - Additional CSS classes to apply to the sidebar
- `onExpandChange`: (isExpanded: boolean) => void (optional) - Callback when expand state changes
- `expandButtonClassName`: string (optional) - Additional CSS classes for the expand button
- `title`: string (optional) - Title for the sidebar (for accessibility)

#### Usage

```tsx
import { SidebarLeft } from '@/components/ui/SidebarLeft';

const MyComponent = () => {
  const handleExpandChange = (isExpanded: boolean) => {
    console.log('Sidebar expanded:', isExpanded);
  };

  return (
    <SidebarLeft
      defaultWidth="w-64"
      expandedWidth="w-[70vw]"
      onExpandChange={handleExpandChange}
      className="border-r border-gray-200"
    >
      <div className="p-4">
        <h2>My Sidebar Content</h2>
        {/* Your content here */}
      </div>
    </SidebarLeft>
  );
};
```

### SidebarRight

A sidebar that expands from the right side of the screen.

#### Props

Same as SidebarLeft, but the expand button appears on the left edge of the sidebar.

#### Usage

```tsx
import { SidebarRight } from '@/components/ui/SidebarRight';

const MyComponent = () => {
  const handleExpandChange = (isExpanded: boolean) => {
    console.log('Sidebar expanded:', isExpanded);
  };

  return (
    <SidebarRight
      defaultWidth="w-80"
      expandedWidth="w-[60vw]"
      onExpandChange={handleExpandChange}
      className="border-l border-gray-200"
    >
      <div className="p-4">
        <h2>My Right Sidebar Content</h2>
        {/* Your content here */}
      </div>
    </SidebarRight>
  );
};
```

## Features

- **Smooth Animations**: Includes blur effect during resize and smooth width transitions
- **Configurable Widths**: Set custom default and expanded widths using Tailwind classes
- **Icon States**: Shows different icons for expanded/collapsed states
- **High Z-Index**: Properly layered to appear above other content
- **Responsive**: Works with viewport-based widths (vw units)
- **Accessibility**: Includes proper titles and ARIA attributes
- **Callbacks**: Optional callback when expand state changes

## Migrating from TicketSidebar

To migrate an existing component like TicketSidebar to use these reusable components:

1. Import the appropriate sidebar component
2. Wrap your existing content with the sidebar component
3. Remove the expand/collapse logic from your component
4. Pass the content as children to the sidebar

### Before (Original TicketSidebar)

```tsx
export const TicketSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  // ... expand logic

  return (
    <div className="h-full relative">
      <div className={`h-full ... ${isExpanded ? 'w-[80vw]' : 'w-80'}`}>
        {/* content */}
      </div>
      {/* expand button */}
    </div>
  );
};
```

### After (Using SidebarLeft)

```tsx
import { SidebarLeft } from '@/components/ui/SidebarLeft';

export const TicketSidebar = () => {
  return (
    <SidebarLeft defaultWidth="w-80" expandedWidth="w-[80vw]">
      {/* content */}
    </SidebarLeft>
  );
};
```

## Examples

See `src/components/examples/SidebarExamples.tsx` for complete usage examples including:

- Basic left sidebar with navigation
- Right sidebar with properties panel
- Layout with both sidebars

## Styling

The components use Tailwind CSS classes and can be customized by:

- Passing custom `className` props
- Overriding default widths
- Customizing the expand button with `expandButtonClassName`

The sidebars have a high z-index (50) and the expand buttons have an even higher z-index (55) to ensure they appear above other content.
