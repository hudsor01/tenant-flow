
/**
 * Units Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function UnitsLayout({
	children,
	modal
}: LayoutProps<'/units'>) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
