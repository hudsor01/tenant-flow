import type { ReactNode } from 'react'

/**
 * Maintenance Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function MaintenanceLayout({
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
