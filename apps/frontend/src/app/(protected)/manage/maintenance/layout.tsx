

/**
 * Maintenance Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function MaintenanceLayout({
	children,
	modal
}: LayoutProps<'/manage/maintenance'>) {
	return (
		<>
			{children}
			{modal}
		</>
	)
}
