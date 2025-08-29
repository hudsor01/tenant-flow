import { type ClassValue, clsx } from "clsx"

/**
 * UnoCSS compatible utility for combining classes
 * Since UnoCSS uses compile-time optimization, we use clsx for runtime class merging
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}