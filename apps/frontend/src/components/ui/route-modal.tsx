'use client'

import { Dialog, DialogContent } from '#components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useModalStore } from '#stores/modal-store'
import type { ReactNode } from 'react'

interface RouteModalProps {
	children: ReactNode
	className?: string
	modalId?: string
	persistThroughNavigation?: boolean
}

/**
 * RouteModal - Wrapper for intercepting routes that display as modals
 *
 * This component wraps Dialog to provide consistent modal behavior for
 * intercepting routes. When the dialog closes, it navigates back using
 * the router, which provides natural back-button UX.
 *
 * Enhanced with modal store integration for:
 * - Global modal state management
 * - React Spring animations
 * - Auto-close behaviors
 * - Navigation persistence
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
 *     <RouteModal
 *       modalId="new-property"
 *       className="max-w-3xl max-h-[90vh] overflow-y-auto"
 *       persistThroughNavigation={false}
 *     >
 *       <PropertyForm mode="create" />
 *     </RouteModal>
 *   )
 * }
 * ```
 */
export function RouteModal({
	children,
	className,
	modalId = 'route-modal',
	persistThroughNavigation = false
}: RouteModalProps) {
	const router = useRouter()
	const { openModal, closeModal, handleNavigation } = useModalStore()

	useEffect(() => {
		// Register modal with store on mount
		openModal(
			modalId,
			{},
			{
				type: 'dialog',
				size: 'xl',
				animationVariant: 'fade',
				closeOnOutsideClick: true,
				closeOnEscape: true,
				persistThroughNavigation
			}
		)

		// Cleanup on unmount
		return () => {
			closeModal(modalId)
		}
	}, [modalId, openModal, closeModal, persistThroughNavigation])

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			// Handle navigation-based modal closing
			handleNavigation(window.location.pathname)
			router.back()
		}
	}

	return (
		<Dialog defaultOpen onOpenChange={handleOpenChange}>
			<DialogContent className={className}>{children}</DialogContent>
		</Dialog>
	)
}
