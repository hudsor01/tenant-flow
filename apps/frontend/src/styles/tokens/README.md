# Design Token System Documentation

## Overview

This design token system provides a comprehensive, scalable foundation for TenantFlow's UI implementation. Built with accessibility-first principles, it integrates seamlessly with Tailwind CSS v4, shadcn/ui, and Radix UI.

## Architecture

```
┌─────────────────────────────────────────┐
│           Component Layer               │
│     (shadcn/ui, Radix UI components)   │
├─────────────────────────────────────────┤
│           Semantic Layer                │
│    (Purpose-driven design decisions)   │
├─────────────────────────────────────────┤
│           Primitive Layer               │
│        (Raw OKLCH color values)        │
└─────────────────────────────────────────┘
```

## File Structure

```
src/styles/tokens/
├── colors.ts              # Color token definitions
├── typography.ts          # Typography system
├── spacing.ts            # Spacing scale and semantics
├── components.ts         # Component-specific tokens
├── tailwind-integration.ts # Tailwind CSS v4 config
├── utils/
│   └── contrast.ts       # WCAG accessibility utilities
└── __tests__/
    └── colors.test.ts    # Accessibility validation tests
```

## Color System

### OKLCH Color Space

We use OKLCH (Oklab Lightness Chroma Hue) for perceptually uniform colors:

- **L** (Lightness): 0-1 scale for brightness
- **C** (Chroma): Color intensity/saturation
- **H** (Hue): Color angle in degrees

### Color Scales

#### Primary Colors

```typescript
// Steel Blue - Primary brand color
const steel = {
  50: 'oklch(0.96 0.02 235)',  // Light backgrounds
  500: 'oklch(0.52 0.18 235)',  // Primary actions
  900: 'oklch(0.26 0.06 235)',  // Dark text
}

// Teal - Accent color
const teal = {
  50: 'oklch(0.96 0.02 185)',
  500: 'oklch(0.55 0.15 185)',  // Accent elements
  900: 'oklch(0.28 0.06 185)',
}

// Charcoal - Neutral scale
const charcoal = {
  50: 'oklch(0.98 0.005 240)', // Background
  800: 'oklch(0.25 0.005 240)', // Primary text
  950: 'oklch(0.12 0.005 240)', // Maximum contrast
}
```

### Accessibility

All color combinations are tested for WCAG 2.1 compliance:

- **AA Standard**: 4.5:1 for normal text, 3:1 for large text
- **AAA Standard**: 7:1 for normal text, 4.5:1 for large text

Run tests: `npm run test src/styles/tokens/__tests__/colors.test.ts`

## Typography System

### Font Families

```css
--font-heading: 'Outfit', 'DM Sans', system-ui;
--font-body: 'Inter', system-ui;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

Based on 1.25 modular scale:

```typescript
const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px (base)
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
}
```

### Text Styles

Pre-composed text styles for consistency:

```typescript
// Display text (hero sections)
textStyles.display.lg

// Content hierarchy
textStyles.heading.h1
textStyles.heading.h2

// Body text
textStyles.body.base
textStyles.body.sm

// UI elements
textStyles.label.base
textStyles.button.base
textStyles.caption.base
```

## Spacing System

### Base Unit

4px base unit for consistent rhythm:

```typescript
const spacing = {
  1: '0.25rem',   // 4px - base unit
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
}
```

### Semantic Spacing

Purpose-driven spacing tokens:

```typescript
// Component padding
componentSpacing.component.base  // 12px default

// Layout spacing
componentSpacing.layout.base     // 24px sections

// Form spacing
componentSpacing.form.field      // 12px between fields
componentSpacing.form.group      // 24px between groups
```

## Component Integration

### shadcn/ui Components

All shadcn/ui components map to our token system:

```typescript
// Button example
shadcnComponentTokens.button.variants.default = {
  background: componentColors.button.primary.background,
  color: componentColors.button.primary.text,
  ...textStyles.button.base,
}

// Input example
shadcnComponentTokens.input.base = {
  background: componentColors.input.background,
  borderColor: componentColors.input.border,
  ...textStyles.body.base,
}
```

### Using Tokens in Components

```tsx
import { componentColors, textStyles } from '@/styles/tokens';

// Direct usage
const customStyles = {
  color: componentColors.button.primary.text,
  ...textStyles.heading.h3,
};

// With Tailwind utilities
<div className="text-body-lg card-padding">
  Content
</div>

// With CSS variables
<div style={{ color: 'var(--color-steel-500)' }}>
  Styled content
</div>
```

## Tailwind CSS v4 Integration

### Configuration

```typescript
// tailwind.config.ts
import { tailwindTokens } from '@/styles/tokens/tailwind-integration';

export default {
  theme: {
    extend: {
      colors: tailwindTokens.colors,
      spacing: tailwindTokens.spacing,
      fontFamily: tailwindTokens.fontFamily,
      fontSize: tailwindTokens.fontSize,
    }
  }
}
```

### Custom Utilities

Pre-built utilities for common patterns:

```css
/* Typography utilities */
.text-display-lg   /* Large display text */
.text-h1           /* Heading 1 style */
.text-body         /* Body text style */
.text-label        /* Form label style */

/* Layout utilities */
.container-padding /* Responsive container padding */
.card-padding      /* Standard card padding */

/* Form utilities */
.form-field-spacing   /* Space between fields */
.form-group-spacing   /* Space between groups */
```

## Icon System

### Lucide React

```tsx
import { Home } from 'lucide-react';
import { iconTokens } from '@/styles/tokens/components';

<Home 
  size={iconTokens.sizes.base}  // 20px
  strokeWidth={iconTokens.strokeWidth.default}  // 2
/>
```

### React Icons

```tsx
import { FaGithub } from 'react-icons/fa';
import { iconTokens } from '@/styles/tokens/components';

<FaGithub 
  size={iconTokens.sizes.base}  // 20px
/>
```

## Testing & Validation

### Accessibility Testing

```bash
# Run color contrast tests
npm run test src/styles/tokens/__tests__/colors.test.ts

# Generate accessibility report
npm run test -- --reporter=verbose
```

### Visual Regression Testing

```bash
# Run Playwright visual tests
npm run test:visual

# Update snapshots
npm run test:visual:update
```

## Usage Guidelines

### Do's ✅

- Use semantic tokens for purpose-driven styling
- Test color combinations for WCAG compliance
- Leverage pre-composed text styles
- Use spacing tokens for consistent rhythm
- Map components to token system

### Don'ts ❌

- Don't use primitive tokens directly in components
- Don't create arbitrary values outside the system
- Don't mix token systems (stick to one approach)
- Don't override accessibility-tested combinations
- Don't ignore responsive considerations

## Migration Guide

### From Current System

1. **Color Migration**
   ```css
   /* Old */
   color: var(--primary);
   
   /* New */
   color: componentColors.button.primary.background;
   ```

2. **Typography Migration**
   ```css
   /* Old */
   font-size: 1.5rem;
   font-weight: 600;
   
   /* New */
   ...textStyles.heading.h3
   ```

3. **Spacing Migration**
   ```css
   /* Old */
   padding: 16px;
   
   /* New */
   padding: spacing[4];
   ```

## Performance Optimization

### CSS Variable Scoping

```css
/* Root level - global tokens */
:root {
  --color-primary: oklch(0.52 0.18 235);
}

/* Component level - scoped tokens */
.button {
  --button-padding: var(--spacing-4);
}
```

### Bundle Size Optimization

- Tree-shake unused tokens
- Use CSS custom properties for runtime theming
- Leverage Tailwind's purge for production builds

## Future Enhancements

### Planned Features

1. **Dark Mode**: Full dark theme with inverted tokens
2. **Themes**: Multiple theme presets (professional, modern, classic)
3. **Motion Tokens**: Animation and transition system
4. **Responsive Tokens**: Breakpoint-aware token values
5. **Color Modes**: High contrast and colorblind-friendly modes

### Token Evolution

The token system is designed to evolve:

1. **Primitive Layer**: Rarely changes
2. **Semantic Layer**: Updates with design decisions
3. **Component Layer**: Evolves with UI requirements

## Support & Contributing

### Questions?

- Check existing tokens before creating new ones
- Run accessibility tests for new combinations
- Document purpose-driven decisions
- Follow the 3-layer architecture

### Testing New Tokens

```typescript
// Add to colors.test.ts
const newCombination = {
  foreground: 'your-foreground-color',
  background: 'your-background-color',
  label: 'Description',
};

// Test will validate WCAG compliance
```

## Resources

- [OKLCH Color Space](https://oklch.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)