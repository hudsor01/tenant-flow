import type { Appearance } from '@stripe/stripe-js'

/**
 * Stripe Elements Appearance Configuration
 * 
 * Matches the modern masculine theme of TenantFlow:
 * - Steel blue primary colors
 * - Slate gray secondaries
 * - Deep teal accents
 * - Clean, minimalist design with generous whitespace
 * - High contrast for accessibility
 */

// Color system derived from modern-theme.css
const colors = {
  // Primary - Steel Blue
  primary: 'oklch(0.45 0.16 235)',
  primaryHover: 'oklch(0.40 0.16 235)',
  primaryForeground: 'oklch(0.98 0.001 240)',
  
  // Secondary - Slate Gray
  secondary: 'oklch(0.35 0.05 240)',
  secondaryHover: 'oklch(0.30 0.05 240)',
  secondaryForeground: 'oklch(0.98 0.001 240)',
  
  // Accent - Deep Teal
  accent: 'oklch(0.40 0.12 200)',
  accentHover: 'oklch(0.35 0.12 200)',
  
  // Base colors
  background: 'oklch(0.98 0.001 240)', // Near white
  foreground: 'oklch(0.15 0.02 240)', // Deep charcoal
  card: 'oklch(1 0 0)', // Pure white
  
  // Muted tones
  muted: 'oklch(0.96 0.003 240)', // Light gray background
  mutedForeground: 'oklch(0.45 0.01 240)', // Medium gray text
  
  // Borders and inputs
  border: 'oklch(0.91 0.004 240)', // Light border
  borderHover: 'oklch(0.85 0.006 240)',
  
  // Status colors
  danger: 'oklch(0.50 0.18 25)', // Muted red
  success: 'oklch(0.45 0.12 142)', // Muted green
  warning: 'oklch(0.65 0.12 85)', // Muted amber
}

// Typography matching the theme
const typography = {
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  fontSizeBase: '16px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  letterSpacing: '0em',
  lineHeight: '1.6',
}

// Spacing and layout
const spacing = {
  spacingUnit: '4px',
  borderRadius: '8px', // 0.5rem
  borderRadiusLg: '10px', // 0.625rem
  borderRadiusXl: '12px', // 0.75rem
}

/**
 * Main Stripe appearance configuration
 */
export const stripeAppearance: Appearance = {
  theme: 'none', // Start with no theme to have full control
  
  variables: {
    // Colors
    colorPrimary: colors.primary,
    colorBackground: colors.background,
    colorText: colors.foreground,
    colorDanger: colors.danger,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorTextSecondary: colors.mutedForeground,
    colorTextPlaceholder: colors.mutedForeground,
    
    // Typography
    fontFamily: typography.fontFamily,
    fontSizeBase: typography.fontSizeBase,
    fontWeightLight: typography.fontWeightNormal,
    fontWeightNormal: typography.fontWeightNormal,
    fontWeightMedium: typography.fontWeightMedium,
    fontWeightBold: typography.fontWeightBold,
    fontLineHeight: typography.lineHeight,
    
    // Font sizes
    fontSizeXl: '20px',
    fontSizeLg: '18px',
    fontSizeSm: '14px',
    fontSizeXs: '12px',
    fontSize2Xs: '11px',
    fontSize3Xs: '10px',
    
    // Spacing
    spacingUnit: spacing.spacingUnit,
    borderRadius: spacing.borderRadius,
    
    // Grid spacing for multi-column layouts
    gridColumnSpacing: '16px',
    gridRowSpacing: '16px',
    
    // Component-specific spacing
    accordionItemSpacing: '12px',
    pickerItemSpacing: '8px',
    tabSpacing: '24px',
  },
  
  rules: {
    // Base input styling
    '.Input': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: '1px',
      borderRadius: spacing.borderRadius,
      fontSize: typography.fontSizeBase,
      padding: '12px 16px',
      transition: 'all 150ms ease',
      boxShadow: 'none',
      minHeight: '44px', // Better touch targets for mobile
    },
    
    '.Input:hover': {
      borderColor: colors.borderHover,
    },
    
    '.Input:focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primary}20`,
      outline: 'none',
    },
    
    '.Input--invalid': {
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}05`,
    },
    
    '.Input::placeholder': {
      color: colors.mutedForeground,
      opacity: '0.7',
    },
    
    // Labels
    '.Label': {
      color: colors.foreground,
      fontSize: '14px',
      fontWeight: typography.fontWeightMedium,
      marginBottom: '6px',
    },
    
    '.Label--invalid': {
      color: colors.danger,
    },
    
    // Error messages
    '.Error': {
      color: colors.danger,
      fontSize: '13px',
      marginTop: '4px',
      fontWeight: typography.fontWeightNormal,
    },
    
    // Tabs for payment methods
    '.Tab': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: '1px',
      borderRadius: spacing.borderRadius,
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: typography.fontWeightMedium,
      transition: 'all 150ms ease',
      color: colors.foreground,
      minHeight: '44px', // Consistent touch targets
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    '.Tab:hover': {
      backgroundColor: colors.muted,
      borderColor: colors.borderHover,
      transform: 'translateY(-1px)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    },
    
    '.Tab--selected': {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      color: colors.primaryForeground,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
    },
    
    '.Tab--selected:hover': {
      backgroundColor: colors.primaryHover,
      borderColor: colors.primaryHover,
    },
    
    '.TabIcon': {
      fill: 'currentColor',
    },
    
    '.TabLabel': {
      fontWeight: typography.fontWeightMedium,
    },
    
    // Checkboxes
    '.Checkbox': {
      borderColor: colors.border,
      borderRadius: '4px',
      transition: 'all 150ms ease',
    },
    
    '.Checkbox:hover': {
      borderColor: colors.primary,
    },
    
    '.Checkbox--checked': {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    
    '.CheckboxLabel': {
      color: colors.foreground,
      fontSize: '14px',
      marginLeft: '8px',
    },
    
    // Radio buttons
    '.RadioIcon': {
      width: '20px',
      height: '20px',
    },
    
    '.RadioIconOuter': {
      stroke: colors.border,
      strokeWidth: '2px',
      fill: 'none',
    },
    
    '.RadioIconOuter--checked': {
      stroke: colors.primary,
    },
    
    '.RadioIconInner': {
      fill: 'none',
      r: '6px',
    },
    
    '.RadioIconInner--checked': {
      fill: colors.primary,
    },
    
    // Dropdowns
    '.Dropdown': {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: spacing.borderRadius,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
    },
    
    '.DropdownItem': {
      color: colors.foreground,
      fontSize: '14px',
      padding: '10px 16px',
      transition: 'all 150ms ease',
    },
    
    '.DropdownItem:hover': {
      backgroundColor: colors.muted,
    },
    
    '.DropdownItem--highlight': {
      backgroundColor: colors.muted,
    },
    
    // Picker items (saved payment methods)
    '.PickerItem': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: spacing.borderRadius,
      padding: '16px',
      transition: 'all 150ms ease',
    },
    
    '.PickerItem:hover': {
      backgroundColor: colors.muted,
      borderColor: colors.borderHover,
      transform: 'translateY(-1px)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    },
    
    '.PickerItem--selected': {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}08`,
      boxShadow: `0 0 0 2px ${colors.primary}30`,
    },
    
    // Blocks (sections)
    '.Block': {
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: spacing.borderRadiusLg,
      padding: '20px',
      marginBottom: '16px',
    },
    
    '.BlockDivider': {
      backgroundColor: colors.border,
      height: '1px',
      margin: '20px 0',
    },
    
    // Accordion items
    '.AccordionItem': {
      borderColor: colors.border,
      borderRadius: spacing.borderRadius,
      overflow: 'hidden',
      transition: 'all 150ms ease',
    },
    
    '.AccordionItem:hover': {
      borderColor: colors.borderHover,
    },
    
    '.AccordionItem--selected': {
      borderColor: colors.primary,
    },
    
    // Code input (for SMS verification)
    '.CodeInput': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: spacing.borderRadius,
      fontSize: '20px',
      padding: '12px',
      textAlign: 'center',
      fontFamily: typography.fontFamily,
      fontWeight: typography.fontWeightMedium,
      letterSpacing: '0.25em',
    },
    
    '.CodeInput:focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primary}20`,
    },
    
    // Switch elements
    '.Switch': {
      backgroundColor: colors.muted,
      borderRadius: '12px',
    },
    
    '.Switch--active': {
      backgroundColor: colors.primary,
    },
    
    '.SwitchControl': {
      backgroundColor: colors.background,
      borderRadius: '10px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    
    // Menu items
    '.Menu': {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: spacing.borderRadius,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
    },
    
    '.MenuAction': {
      color: colors.foreground,
      fontSize: '14px',
      fontWeight: typography.fontWeightMedium,
      padding: '10px 16px',
      transition: 'all 150ms ease',
    },
    
    '.MenuAction:hover': {
      backgroundColor: colors.muted,
    },
    
    '.MenuAction--negative': {
      color: colors.danger,
    },
    
    '.MenuAction--negative:hover': {
      backgroundColor: `${colors.danger}10`,
    },
    
    // Payment method messaging
    '.PaymentMethodMessaging': {
      fontSize: '13px',
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
    
    // Enhanced mobile responsiveness
    '@media (max-width: 640px)': {
      '.Input': {
        fontSize: '16px', // Prevent zoom on iOS
        padding: '14px 16px',
      },
      '.Tab': {
        padding: '14px 16px',
        fontSize: '14px',
      },
      '.Block': {
        padding: '16px',
        borderRadius: spacing.borderRadius,
      },
    },
    
    // High contrast mode support for accessibility
    '@media (prefers-contrast: high)': {
      '.Input': {
        borderWidth: '2px',
      },
      '.Input:focus': {
        borderWidth: '3px',
      },
      '.Tab--selected': {
        borderWidth: '2px',
      },
    },
    
    // Reduced motion support
    '@media (prefers-reduced-motion: reduce)': {
      '.Input': {
        transition: 'none',
      },
      '.Tab': {
        transition: 'none',
      },
      '.Tab:hover': {
        transform: 'none',
      },
      '.PickerItem:hover': {
        transform: 'none',
      },
    },
  },
}

/**
 * Dark mode variant of the appearance configuration
 */
export const stripeAppearanceDark: Appearance = {
  ...stripeAppearance,
  variables: {
    ...stripeAppearance.variables,
    // Override colors for dark mode
    colorBackground: 'oklch(0.205 0 0)',
    colorText: 'oklch(0.985 0 0)',
    colorTextSecondary: 'oklch(0.708 0 0)',
    colorTextPlaceholder: 'oklch(0.556 0 0)',
  },
  rules: {
    ...stripeAppearance.rules,
    // Override specific rules for dark mode
    '.Input': {
      ...stripeAppearance.rules?.['.Input'],
      backgroundColor: 'oklch(0.145 0 0)',
      borderColor: 'oklch(1 0 0 / 15%)',
    },
    '.Tab': {
      ...stripeAppearance.rules?.['.Tab'],
      backgroundColor: 'oklch(0.205 0 0)',
      borderColor: 'oklch(1 0 0 / 10%)',
    },
    // Add more dark mode overrides as needed
  },
}

/**
 * Minimal appearance for embedded checkout
 * Uses fewer customizations for better performance
 */
export const stripeAppearanceMinimal: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: colors.primary,
    colorBackground: colors.background,
    colorText: colors.foreground,
    colorDanger: colors.danger,
    fontFamily: typography.fontFamily,
    fontSizeBase: typography.fontSizeBase,
    spacingUnit: spacing.spacingUnit,
    borderRadius: spacing.borderRadius,
  },
}

/**
 * Mobile-optimized appearance for better touch interaction
 * Larger touch targets and simplified layout
 */
export const stripeAppearanceMobile: Appearance = {
  theme: 'none',
  variables: {
    ...stripeAppearance.variables,
    fontSizeBase: '16px', // Prevent zoom on iOS
    spacingUnit: '6px', // More generous spacing
  },
  rules: {
    '.Input': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: '1px',
      borderRadius: spacing.borderRadius,
      fontSize: '16px',
      padding: '16px 20px',
      minHeight: '56px', // Larger touch targets
      transition: 'all 150ms ease',
      boxShadow: 'none',
    },
    '.Input:focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 4px ${colors.primary}20`,
      outline: 'none',
    },
    '.Tab': {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: '1px',
      borderRadius: spacing.borderRadius,
      padding: '16px 24px',
      fontSize: '16px',
      fontWeight: typography.fontWeightMedium,
      minHeight: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 150ms ease',
      color: colors.foreground,
    },
    '.Tab--selected': {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      color: colors.primaryForeground,
      boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
    },
    '.Block': {
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: spacing.borderRadiusLg,
      padding: '24px',
      marginBottom: '20px',
    },
  },
}