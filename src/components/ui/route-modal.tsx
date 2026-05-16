"use client";

import { useRouter } from "next/navigation";

import { VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	type DialogIntent,
	DialogTitle,
} from "#components/ui/dialog";
import { cn } from "#lib/utils";

interface RouteModalProps {
	children: ReactNode;
	className?: string;
	intent?: DialogIntent;
	/** Accessible title for screen readers (visually hidden) */
	accessibleTitle?: string;
}

/**
 * RouteModal - Modal wrapper for Next.js intercepting routes
 *
 * Used in @modal parallel route segments to display content as a modal overlay.
 * Always renders open and closes by navigating back (router.back()).
 *
 * @example
 * // In @modal/(.)new/page.tsx
 * export default function NewItemModal() {
 *   return (
 *     <RouteModal intent="create">
 *       <ItemForm mode="create" />
 *     </RouteModal>
 *   )
 * }
 */
export function RouteModal({
	children,
	className,
	intent,
	accessibleTitle,
}: RouteModalProps) {
	const router = useRouter();

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			router.back();
		}
	};

	// Generate default title based on intent for accessibility
	const defaultTitle =
		intent === "create"
			? "Create new item"
			: intent === "edit"
				? "Edit item"
				: intent === "delete"
					? "Delete item"
					: "Modal dialog";

	// Default description silences the Radix a11y warning ("DialogContent
	// requires a DialogTitle for accessibility… consider providing a
	// `Description`"). Caller-provided children render the real form/UI
	// below; this is just the screen-reader landmark.
	const defaultDescription =
		intent === "create"
			? "Form to create a new item."
			: intent === "edit"
				? "Form to edit the item."
				: intent === "delete"
					? "Confirmation to delete the item."
					: "Modal content.";

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent
				intent={intent}
				className={cn("max-h-[90vh] overflow-y-auto", className)}
			>
				{/* Visually hidden title + description for screen reader
				    accessibility and to satisfy Radix's a11y contract. */}
				<VisuallyHidden.Root asChild>
					<DialogTitle>{accessibleTitle ?? defaultTitle}</DialogTitle>
				</VisuallyHidden.Root>
				<VisuallyHidden.Root asChild>
					<DialogDescription>{defaultDescription}</DialogDescription>
				</VisuallyHidden.Root>
				{children}
			</DialogContent>
		</Dialog>
	);
}
