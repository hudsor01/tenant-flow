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
	/**
	 * Optional accessible description (visually hidden). Render one when the
	 * modal's purpose isn't obvious from the title alone — Radix wires it via
	 * `aria-describedby`. When omitted we explicitly pass `aria-describedby=
	 * undefined` to DialogContent so Radix doesn't log the missing-description
	 * warning AND screen readers don't get a redundant restatement of the
	 * title.
	 */
	accessibleDescription?: string;
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
	accessibleDescription,
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

	// Radix opts out of the missing-`aria-describedby` warning when the prop
	// is explicitly passed as `undefined`. We do that whenever the caller
	// hasn't supplied a real description, instead of emitting redundant
	// screen-reader copy that just restates the title (cycle-1 P2).
	const describedById = accessibleDescription ? "route-modal-desc" : undefined;

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent
				intent={intent}
				className={cn("max-h-[90vh] overflow-y-auto", className)}
				aria-describedby={describedById}
			>
				<VisuallyHidden.Root asChild>
					<DialogTitle>{accessibleTitle ?? defaultTitle}</DialogTitle>
				</VisuallyHidden.Root>
				{accessibleDescription && (
					<VisuallyHidden.Root asChild>
						<DialogDescription id={describedById}>
							{accessibleDescription}
						</DialogDescription>
					</VisuallyHidden.Root>
				)}
				{children}
			</DialogContent>
		</Dialog>
	);
}
