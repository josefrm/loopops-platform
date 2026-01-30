# Integrations Component

A reusable React component for displaying and managing integration badges with active/inactive states.

## Features

- **Clickable Badges**: Toggle between active and inactive states
- **Custom Styling**: Follows the specified design with active/inactive styles
- **Form Integration**: Easily integrates with React Hook Form
- **Flexible Configuration**: Supports custom integrations list and callbacks

## Styling

### Active State

- Background: White (#FFF)
- Text Color: #666
- Border: None
- Border Radius: 100px (pill shape)

### Inactive State

- Background: Transparent
- Text Color: rgba(255, 255, 255, 0.30)
- Border: 1px solid rgba(255, 255, 255, 0.30)
- Border Radius: 100px (pill shape)

### Common Styles

- Display: flex
- Min Height: 24px
- Padding: 4px 16px
- Flex Direction: column
- Justify Content: center
- Align Items: flex-start
- Gap: 10px

## Usage

```tsx
import { Integrations } from '@/components/ui/Integrations';

// Basic usage
<Integrations />

// With custom integrations and form integration
<Integrations
  defaultActiveIntegrations={['jira', 'github']}
  onActiveIntegrationsChange={(activeIds) => {
    setValue('active_integrations', activeIds);
  }}
/>

// With custom integrations list
const customIntegrations = [
  { id: 'slack', name: 'Slack', enabled: true },
  { id: 'teams', name: 'Teams', enabled: false },
];

<Integrations
  integrations={customIntegrations}
  onActiveIntegrationsChange={(activeIds) => {
    console.log('Active integrations:', activeIds);
  }}
/>
```

## Props

| Prop                         | Type                            | Default                                            | Description                              |
| ---------------------------- | ------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| `integrations`               | `Integration[]`                 | `[{id: 'jira', name: 'Jira', enabled: true}, ...]` | Array of available integrations          |
| `defaultActiveIntegrations`  | `string[]`                      | `[]`                                               | Initially active integration IDs         |
| `onActiveIntegrationsChange` | `(activeIds: string[]) => void` | `undefined`                                        | Callback when active integrations change |
| `className`                  | `string`                        | `''`                                               | Additional CSS classes                   |

## Integration Interface

```tsx
interface Integration {
  id: string; // Unique identifier
  name: string; // Display name
  enabled?: boolean; // Whether the integration is available for selection
}
```

## Form Integration Example

```tsx
// In your form component
const { setValue, watch } = useForm({
  defaultValues: {
    active_integrations: ['jira', 'github', 'figma'],
  },
});

const watchedValues = watch();

<Integrations
  defaultActiveIntegrations={watchedValues.active_integrations || []}
  onActiveIntegrationsChange={(activeIds) => {
    setValue('active_integrations', activeIds);
  }}
/>;
```

## Integration with Agent Creation

The component is integrated with the CreateAgent form to track which integrations the agent should have access to. The selected integrations are included in the form submission data and can be used to configure the agent's capabilities.
