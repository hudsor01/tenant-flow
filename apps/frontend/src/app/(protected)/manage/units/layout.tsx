import type { ReactNode } from 'react'

/**
 * Units Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function UnitsLayout({
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
