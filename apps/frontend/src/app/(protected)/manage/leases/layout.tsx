import type { ReactNode } from 'react'

/**
 * Leases Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function LeasesLayout({
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
