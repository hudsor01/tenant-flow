

/**
 * Leases Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function LeasesLayout({
	children,
	modal
}: LayoutProps<'/leases'>) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
