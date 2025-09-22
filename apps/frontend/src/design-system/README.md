# TenantFlow Design System

Apple-inspired design tokens for consistent, minimalist UI.

## Structure

```
design-system/
└── tokens/
    ├── index.ts        # TypeScript exports
    ├── index.json      # Token index
    ├── essential.json  # Core tokens (8KB)
    ├── typography.json # Text styles
    ├── colors.json     # Color palette
    ├── components.json # UI states
    ├── effects.json    # Visual effects
    └── complete.json   # Full tokens (60KB)
```

## Usage

### Import in React components:

```tsx
// Import specific tokens
import { colors, typography } from '@/design-system/tokens'

// Or use quick access
import tokens from '@/design-system/tokens'

// Use in components
const Button = styled.button`
  color: ${tokens.primary};
  font-family: ${tokens.fontFamily};
  font-size: ${tokens.fontSize.body};
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.md};
`
```

### Token Categories

#### Typography
- 11 text styles from LargeTitle (26px) to Caption (10px)
- Roboto Flex font family
- Regular and Emphasized variants

#### Colors
- Primary: `#0D6FFF` (blue)
- Success: `#34C759` (green)
- Error: `#FF383C` (red)
- Warning: `#FFCC00` (yellow)
- System colors for Light/Dark themes
- Gray scales with opacity levels

#### Components
- Button states (idle, clicked, disabled)
- Input fields with focus rings
- Toggle switches
- Glass morphism effects

#### Effects
- Layered shadows for depth
- Glass backgrounds with blur
- Focus ring styles
- Progress indicators

## Design Principles

1. **Minimalism**: Clean, uncluttered interfaces
2. **Hierarchy**: Clear visual structure
3. **Consistency**: Unified design language
4. **Accessibility**: High contrast, clear states
5. **Polish**: Subtle animations and shadows

## Quick Reference

```js
Primary: #0D6FFF
Font: Roboto Flex
Body: 13px
Title: 22px
Success: #34C759
Error: #FF383C
Warning: #FFCC00
```
