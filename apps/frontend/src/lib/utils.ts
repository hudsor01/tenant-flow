import { type ClassValue, clsx } from 'clsx'

/**
 * Utility function to merge class names using clsx
 * Simple class name utility for combining conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}