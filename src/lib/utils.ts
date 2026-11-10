import { type ClassValue, clsx } from "clsx";
import type {
	ConfigExtension,
	DefaultClassGroupIds,
	DefaultThemeGroupIds,
} from "tailwind-merge";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The custom @theme keys in src/app/globals.css that tailwind-merge's default
 * config does not know. Without them, cn drops a custom font size next to a
 * text color. G5 in src/app/__tests__/tailwind-theme-integrity.test.ts derives
 * the expected keys from globals.css and fails on a missing or stale entry.
 */
export const TAILWIND_MERGE_EXTENSION = {
	extend: {
		theme: {
			text: [
				"display-hero",
				"title-1",
				"title-2",
				"title-3",
				"title-4",
				"caption",
				"stat",
			],
			leading: ["display"],
		},
		classGroups: {
			duration: [{ duration: ["instant", "fast", "normal", "slow"] }],
		},
	},
} as const satisfies ConfigExtension<
	DefaultClassGroupIds,
	DefaultThemeGroupIds
>;

const twMerge = extendTailwindMerge(TAILWIND_MERGE_EXTENSION);

/**
 * Combines class names with Tailwind CSS merge support
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or conditionals)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * cn('p-4', 'p-2') // 'p-2' (latter wins)
 * cn("text-caption", "text-primary") // keeps both
 * cn('text-destructive-text', className) // merges with passed className
 * cn({ 'hidden': isHidden }, 'flex') // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
