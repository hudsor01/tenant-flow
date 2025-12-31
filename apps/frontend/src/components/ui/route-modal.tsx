'use client'

import { useRouter } from 'next/navigation'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	type DialogIntent
} from '#components/ui/dialog'
import { cn } from '#lib/utils'

interface RouteModalProps {
	children: React.ReactNode
	className?: string
	intent?: DialogIntent
	/** Accessible title for screen readers (visually hidden) */
	accessibleTitle?: string
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
	accessibleTitle
}: RouteModalProps) {
	const router = useRouter()

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			router.back()
		}
	}

	// Generate default title based on intent for accessibility
	const defaultTitle =
		intent === 'create'
			? 'Create new item'
			: intent === 'edit'
				? 'Edit item'
				: intent === 'delete'
					? 'Delete item'
					: 'Modal dialog'

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent
				intent={intent}
				className={cn('max-h-[90vh] overflow-y-auto', className)}
			>
				{/* Visually hidden title for screen reader accessibility */}
				<VisuallyHidden.Root asChild>
					<DialogTitle>{accessibleTitle ?? defaultTitle}</DialogTitle>
				</VisuallyHidden.Root>
				{children}
			</DialogContent>
		</Dialog>
	)
}
