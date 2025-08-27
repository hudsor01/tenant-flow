import { clsx, type ClassValue } from 'clsx'

/**
 * Combine class names with proper precedence.
 * UnoCSS handles specificity naturally, no merge needed.
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs)
}
