import type { ReactNode } from 'react'

/**
 * Standardized Modal Layout for CRUD Routes
 *
 * Provides consistent modal slot handling across all entity routes.
 * Enables intercepting routes for modal-based navigation:
 * - Click "New/Edit" from list → Modal overlay
 * - Direct navigation or refresh → Full page
 *
 * @param children - The main page content
 * @param modal - The modal content (rendered in parallel)
 */
export default function ModalLayout({
	children,
	modal
}: {
	children: ReactNode
	modal: ReactNode
}) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
