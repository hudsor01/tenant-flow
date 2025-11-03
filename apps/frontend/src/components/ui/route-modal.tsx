'use client'

import { Dialog, DialogContent } from '#components/ui/dialog'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface RouteModalProps {
	children: ReactNode
	className?: string
}

/**
 * RouteModal - Wrapper for intercepting routes that display as modals
 *
 * This component wraps Dialog to provide consistent modal behavior for
 * intercepting routes. When the dialog closes, it navigates back using
 * the router, which provides natural back-button UX.
 *
 * Usage:
 * - In intercepting routes: @modal/(.)new/page.tsx
 * - Wraps form components for modal display
 * - Automatically handles close = router.back()
 *
 * @example
 * ```tsx
 * // apps/frontend/src/app/(protected)/manage/properties/@modal/(.)new/page.tsx
 * import { RouteModal } from '#components/ui/route-modal'
 * import { PropertyForm } from '#components/properties/property-form.client'
 *
 * export default function NewPropertyModal() {
 *   return (
 *     <RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
 *       <PropertyForm mode="create" />
 *     </RouteModal>
 *   )
 * }
 * ```
 */
export function RouteModal({ children, className }: RouteModalProps) {
	const router = useRouter()

	return (
		<Dialog
			defaultOpen
			onOpenChange={open => {
				if (!open) {
					router.back()
				}
			}}
		>
			<DialogContent className={className}>{children}</DialogContent>
		</Dialog>
	)
}
