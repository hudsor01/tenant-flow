import type { ReactNode } from 'react'

/**
 * Tenants Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function TenantsLayout({
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
