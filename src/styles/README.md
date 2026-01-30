# Custom Colors Documentation

This project uses a custom color system defined in `src/styles/colors.css` and extended in the Tailwind configuration.

## Available Colors

### Primary Brand Colors

- **#D8622B** - Main brand color (orange)
- **#E6803F** - Light variant
- **#C4561F** - Dark variant

### Gray Scale

- **#333333** - Dark gray (text primary)
- **#666666** - Medium gray (text secondary)
- **#999999** - Light gray (text muted)
- **#CCCCCC** - Very light gray (borders)
- **#E5E5E5** - Border primary
- **#F0F0F0** - Background light
- **#F5F5F5** - Background lighter
- **#FAFAFA** - Background lightest

## Usage Methods

### 1. CSS Variables (Recommended)

```css
.my-element {
  color: var(--color-primary);
  background-color: var(--color-gray-900);
  border-color: var(--color-border-primary);
}
```

### 2. Tailwind Classes

```tsx
// Using custom brand colors
<div className="bg-brand text-white">Brand Color</div>
<div className="bg-brand-light">Light Brand</div>
<div className="bg-brand-dark">Dark Brand</div>

// Using custom gray scale
<div className="text-neutral-grayscale-60">Dark Gray Text</div>
<div className="bg-neutral-grayscale-50">Medium Gray Background</div>
<div className="border-neutral-grayscale-30">Light Gray Border</div>
```

### 3. Utility Classes

```tsx
// Text colors
<p className="text-primary">Primary text</p>
<p className="text-gray-900">Dark gray text</p>
<p className="text-gray-700">Medium gray text</p>

// Background colors
<div className="bg-primary">Primary background</div>
<div className="bg-gray-900">Dark gray background</div>

// Border colors
<div className="border border-primary">Primary border</div>
<div className="border border-gray-700">Gray border</div>

// Hover states
<button className="hover-primary">Hover for primary color</button>
<button className="hover-bg-primary">Hover for primary background</button>

// Focus states
<input className="focus-primary" />
```

### 4. Direct Hex Values (When needed)

```css
.special-element {
  color: #333333;
  background-color: #d8622b;
  border-color: #666666;
}
```

## Color Categories

### Status Colors

- **Success**: #10B981 (green)
- **Warning**: #F59E0B (yellow)
- **Error**: #EF4444 (red)
- **Info**: #3B82F6 (blue)

### Shadow & Overlay Colors

- **Light Shadow**: rgba(0, 0, 0, 0.1)
- **Medium Shadow**: rgba(0, 0, 0, 0.15)
- **Heavy Shadow**: rgba(0, 0, 0, 0.25)
- **Accent Overlay**: rgba(216, 98, 43, 0.1)

## Examples in Components

### Button with Custom Colors

```tsx
<Button className="bg-brand hover:bg-brand-dark text-white border-brand">
  Custom Button
</Button>
```

### Card with Custom Gray Scale

```tsx
<div className="bg-neutral-grayscale-5 border border-neutral-grayscale-20 p-4">
  <h3 className="text-neutral-grayscale-60">Title</h3>
  <p className="text-brand-accent-50">Description text</p>
</div>
```

### Input with Focus States

```tsx
<input
  className="border border-neutral-grayscale-30 focus-primary p-2 rounded"
  type="text"
/>
```

## Best Practices

1. **Use CSS Variables** for maximum flexibility and theme support
2. **Use Tailwind classes** for quick prototyping and consistency
3. **Use semantic naming** (e.g., `text-primary` instead of `text-orange`)
4. **Maintain contrast ratios** for accessibility
5. **Test colors** in both light and dark themes if applicable

## Adding New Colors

To add new colors:

1. **Add to CSS variables** in `src/styles/colors.css`:

   ```css
   :root {
     --color-new-color: #YOUR_HEX;
   }
   ```

2. **Add to Tailwind config** in `tailwind.config.ts`:

   ```typescript
   colors: {
     'new-color': '#YOUR_HEX',
   }
   ```

3. **Create utility classes** if needed:
   ```css
   .text-new-color {
     color: var(--color-new-color);
   }
   .bg-new-color {
     background-color: var(--color-new-color);
   }
   ```

## File Locations

- **CSS Variables**: `src/styles/colors.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Import**: `src/index.css` (already imported)
- **Documentation**: This file
