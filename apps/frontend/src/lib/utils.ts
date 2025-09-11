import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export design system utilities for easy access
export { 
  buttonClasses,
  inputClasses,
  cardClasses,
  badgeClasses,
  gridClasses,
  containerClasses,
  animationClasses,
  formFieldClasses,
  formLabelClasses,
  formErrorClasses,
  tableClasses,
  generateThemeCSS,
  getSemanticColor,
  responsiveClasses,
} from './design-system'

// Re-export shared design system constants
export {
  SEMANTIC_COLORS,
  COMPONENT_SIZES,
  TYPOGRAPHY_SCALE,
  SPACING_SCALE,
  SHADOW_SCALE,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
} from '@repo/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
