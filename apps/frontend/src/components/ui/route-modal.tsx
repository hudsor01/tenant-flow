'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, type DialogIntent } from '#components/ui/dialog'
import { cn } from '#lib/utils'

interface RouteModalProps {
	children: React.ReactNode
	className?: string
	intent?: DialogIntent
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
export function RouteModal({ children, className, intent }: RouteModalProps) {
	const router = useRouter()

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			router.back()
		}
	}

	return (
		<Dialog open onOpenChange={handleOpenChange}>
			<DialogContent
				intent={intent}
				className={cn('max-h-[90vh] overflow-y-auto', className)}
			>
				{children}
			</DialogContent>
		</Dialog>
	)
}
