

/**
 * Leases Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function LeasesLayout({
	children,
	modal
}: LayoutProps<'/manage/leases'>) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
