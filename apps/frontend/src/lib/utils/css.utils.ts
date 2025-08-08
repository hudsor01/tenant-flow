/**
 * CSS utility functions for styling
 * Used by UI components for dynamic class names
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * This ensures that Tailwind CSS classes are properly merged
 * and duplicate classes are removed
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility for handling conditional classes
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : (falseClass || '');
}

/**
 * Utility for merging component variants
 */
export function mergeVariants(
  base: string,
  variants: Record<string, string | undefined>
): string {
  const validVariants = Object.values(variants).filter(Boolean);
  return cn(base, ...validVariants);
}

/**
 * Utility for focus ring styles
 */
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Utility for button disabled states
 */
export const disabledStyles = 'disabled:pointer-events-none disabled:opacity-50';