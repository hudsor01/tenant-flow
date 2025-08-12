/**
 * Design Token System - Component Token Mapping
 * Maps design tokens to shadcn/ui component variants
 */

import { componentColors } from './colors';
import { componentSpacing } from './spacing';
import { textStyles } from './typography';

// ============================================
// SHADCN/UI COMPONENT TOKEN MAPPING
// ============================================

export const shadcnComponentTokens = {
  // Button component tokens
  button: {
    variants: {
      default: {
        background: componentColors.button.primary.background,
        color: componentColors.button.primary.text,
        borderColor: componentColors.button.primary.border,
        hover: componentColors.button.primary.hover,
        ...textStyles.button.base,
      },
      secondary: {
        background: componentColors.button.secondary.background,
        color: componentColors.button.secondary.text,
        borderColor: componentColors.button.secondary.border,
        hover: componentColors.button.secondary.hover,
        ...textStyles.button.base,
      },
      ghost: {
        background: componentColors.button.ghost.background,
        color: componentColors.button.ghost.text,
        borderColor: componentColors.button.ghost.border,
        hover: componentColors.button.ghost.hover,
        ...textStyles.button.base,
      },
      destructive: {
        background: componentColors.button.danger.background,
        color: componentColors.button.danger.text,
        borderColor: componentColors.button.danger.border,
        hover: componentColors.button.danger.hover,
        ...textStyles.button.base,
      },
      outline: {
        background: 'transparent',
        color: componentColors.button.primary.background,
        borderColor: componentColors.button.primary.background,
        hover: {
          background: `${componentColors.button.primary.background}10`,
          color: componentColors.button.primary.background,
          borderColor: componentColors.button.primary.hover.background,
        },
        ...textStyles.button.base,
      },
      link: {
        background: 'transparent',
        color: componentColors.button.primary.background,
        hover: {
          opacity: 0.8,
        },
        ...textStyles.link.base,
      },
    },
    sizes: {
      xs: {
        padding: componentSpacing.button.padding.xs,
        ...textStyles.button.sm,
      },
      sm: {
        padding: componentSpacing.button.padding.sm,
        ...textStyles.button.sm,
      },
      default: {
        padding: componentSpacing.button.padding.base,
        ...textStyles.button.base,
      },
      lg: {
        padding: componentSpacing.button.padding.lg,
        ...textStyles.button.lg,
      },
    },
  },
  
  // Input component tokens
  input: {
    base: {
      background: componentColors.input.background,
      color: componentColors.input.text,
      borderColor: componentColors.input.border,
      placeholderColor: componentColors.input.placeholder,
      ...textStyles.body.base,
    },
    focus: {
      borderColor: componentColors.input.focus.border,
      ringColor: componentColors.input.focus.ring,
      ringWidth: '2px',
      ringOffset: '2px',
    },
    error: {
      borderColor: componentColors.input.error.border,
      ringColor: componentColors.input.error.ring,
    },
    sizes: {
      sm: {
        padding: componentSpacing.input.padding.sm,
        ...textStyles.body.sm,
      },
      default: {
        padding: componentSpacing.input.padding.base,
        ...textStyles.body.base,
      },
      lg: {
        padding: componentSpacing.input.padding.lg,
        ...textStyles.body.lg,
      },
    },
  },
  
  // Card component tokens
  card: {
    base: {
      background: componentColors.card.background,
      borderColor: componentColors.card.border,
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    },
    hover: {
      background: componentColors.card.hover.background,
      borderColor: componentColors.card.hover.border,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    padding: componentSpacing.card.padding,
  },
  
  // Badge component tokens
  badge: {
    variants: {
      default: {
        background: componentColors.badge.default.background,
        color: componentColors.badge.default.text,
        ...textStyles.caption.base,
      },
      primary: {
        background: componentColors.badge.primary.background,
        color: componentColors.badge.primary.text,
        ...textStyles.caption.base,
      },
      success: {
        background: componentColors.badge.success.background,
        color: componentColors.badge.success.text,
        ...textStyles.caption.base,
      },
      warning: {
        background: componentColors.badge.warning.background,
        color: componentColors.badge.warning.text,
        ...textStyles.caption.base,
      },
      error: {
        background: componentColors.badge.error.background,
        color: componentColors.badge.error.text,
        ...textStyles.caption.base,
      },
    },
    sizes: {
      sm: {
        padding: componentSpacing.badge.padding.sm,
        ...textStyles.caption.sm,
      },
      default: {
        padding: componentSpacing.badge.padding.base,
        ...textStyles.caption.base,
      },
      lg: {
        padding: componentSpacing.badge.padding.lg,
        ...textStyles.body.sm,
      },
    },
  },
  
  // Alert component tokens
  alert: {
    variants: {
      default: componentColors.alert.default,
      success: componentColors.alert.success,
      warning: componentColors.alert.warning,
      error: componentColors.alert.error,
      info: componentColors.alert.info,
    },
    padding: componentSpacing.card.padding.base,
    iconSize: componentSpacing.icon.size.base,
  },
  
  // Dialog/Modal component tokens
  dialog: {
    overlay: {
      background: 'rgba(0, 0, 0, 0.5)',
      backdropBlur: '4px',
    },
    content: {
      background: componentColors.card.background,
      borderRadius: '0.75rem',
      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      padding: componentSpacing.modal.padding,
    },
    header: {
      padding: componentSpacing.modal.header,
      ...textStyles.heading.h3,
    },
    body: {
      padding: componentSpacing.modal.body,
      ...textStyles.body.base,
    },
    footer: {
      padding: componentSpacing.modal.footer,
      gap: componentSpacing.gap.base,
    },
  },
  
  // Dropdown component tokens
  dropdown: {
    trigger: {
      ...textStyles.button.base,
    },
    content: {
      background: componentColors.card.background,
      borderColor: componentColors.card.border,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      padding: componentSpacing.dropdown.padding,
    },
    item: {
      padding: componentSpacing.dropdown.item,
      ...textStyles.body.sm,
      hover: {
        background: componentColors.card.hover.background,
      },
    },
    separator: {
      background: componentColors.card.border,
      margin: componentSpacing.dropdown.gap,
    },
  },
  
  // Tabs component tokens
  tabs: {
    list: {
      background: componentColors.card.background,
      borderColor: componentColors.card.border,
      gap: componentSpacing.tabs.list.gap,
      padding: componentSpacing.tabs.list.padding,
    },
    trigger: {
      padding: componentSpacing.tabs.trigger,
      ...textStyles.button.base,
      default: {
        color: componentColors.navigation.item.text,
      },
      hover: {
        background: componentColors.navigation.item.hover.background,
        color: componentColors.navigation.item.hover.text,
      },
      active: {
        background: componentColors.navigation.item.active.background,
        color: componentColors.navigation.item.active.text,
        borderColor: componentColors.navigation.item.active.border,
      },
    },
    content: {
      padding: componentSpacing.tabs.content.padding,
      ...textStyles.body.base,
    },
  },
  
  // Table component tokens
  table: {
    header: {
      background: componentColors.table.header.background,
      color: componentColors.table.header.text,
      borderColor: componentColors.table.header.border,
      padding: componentSpacing.table.header,
      ...textStyles.label.base,
    },
    row: {
      background: componentColors.table.row.background,
      color: componentColors.table.row.text,
      borderColor: componentColors.table.row.border,
      padding: componentSpacing.table.cell,
      hover: componentColors.table.row.hover,
      striped: componentColors.table.row.striped,
      ...textStyles.body.base,
    },
  },
  
  // Tooltip component tokens
  tooltip: {
    content: {
      background: componentColors.badge.default.background,
      color: componentColors.badge.default.text,
      padding: componentSpacing.tooltip.padding,
      borderRadius: '0.375rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      ...textStyles.caption.base,
    },
    arrow: {
      fill: componentColors.badge.default.background,
    },
    offset: componentSpacing.tooltip.offset,
  },
  
  // Avatar component tokens
  avatar: {
    sizes: componentSpacing.avatar.size,
    border: {
      width: '2px',
      color: componentColors.card.border,
    },
    fallback: {
      background: componentColors.badge.default.background,
      color: componentColors.badge.default.text,
      ...textStyles.label.base,
    },
  },
  
  // Separator component tokens
  separator: {
    color: componentColors.card.border,
    thickness: {
      thin: '1px',
      default: '1px',
      thick: '2px',
    },
    margin: componentSpacing.divider.margin,
  },
  
  // Switch component tokens
  switch: {
    track: {
      width: '44px',
      height: '24px',
      borderRadius: '9999px',
      unchecked: {
        background: componentColors.badge.default.background,
      },
      checked: {
        background: componentColors.button.primary.background,
      },
    },
    thumb: {
      size: '20px',
      background: 'white',
      boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
    },
  },
  
  // Checkbox component tokens
  checkbox: {
    size: '20px',
    borderRadius: '0.25rem',
    borderWidth: '2px',
    unchecked: {
      background: componentColors.input.background,
      borderColor: componentColors.input.border,
    },
    checked: {
      background: componentColors.button.primary.background,
      borderColor: componentColors.button.primary.background,
      iconColor: componentColors.button.primary.text,
    },
    focus: {
      ringColor: componentColors.input.focus.ring,
      ringWidth: '2px',
      ringOffset: '2px',
    },
  },
  
  // Radio component tokens
  radio: {
    size: '20px',
    borderRadius: '9999px',
    borderWidth: '2px',
    unchecked: {
      background: componentColors.input.background,
      borderColor: componentColors.input.border,
    },
    checked: {
      borderColor: componentColors.button.primary.background,
      dotColor: componentColors.button.primary.background,
      dotSize: '8px',
    },
    focus: {
      ringColor: componentColors.input.focus.ring,
      ringWidth: '2px',
      ringOffset: '2px',
    },
  },
  
  // Progress component tokens
  progress: {
    track: {
      height: '8px',
      background: componentColors.badge.default.background,
      borderRadius: '9999px',
    },
    indicator: {
      background: componentColors.button.primary.background,
      borderRadius: '9999px',
    },
  },
  
  // Skeleton component tokens
  skeleton: {
    background: componentColors.badge.default.background,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    borderRadius: '0.375rem',
  },
} as const;

// ============================================
// ICON SYSTEM TOKENS
// ============================================

export const iconTokens = {
  sizes: componentSpacing.icon.size,
  strokeWidth: {
    thin: '1',
    light: '1.5',
    default: '2',
    medium: '2.5',
    bold: '3',
  },
  // Lucide React specific
  lucide: {
    defaultSize: componentSpacing.icon.size.base,
    defaultStrokeWidth: '2',
  },
  // React Icons specific
  reactIcons: {
    defaultSize: componentSpacing.icon.size.base,
  },
} as const;

// ============================================
// ANIMATION TOKENS
// ============================================

export const animationTokens = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
    slower: '500ms',
    slowest: '1000ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideInUp: {
      from: { transform: 'translateY(100%)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideInDown: {
      from: { transform: 'translateY(-100%)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.9)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },
  },
} as const;

// Type exports
export type ShadcnComponentTokens = typeof shadcnComponentTokens;
export type IconTokens = typeof iconTokens;
export type AnimationTokens = typeof animationTokens;