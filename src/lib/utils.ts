import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind CSS merge support
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or conditionals)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * cn('p-4', 'p-2') // 'p-2' (latter wins)
 * cn('text-red-500', className) // merges with passed className
 * cn({ 'hidden': isHidden }, 'flex') // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
