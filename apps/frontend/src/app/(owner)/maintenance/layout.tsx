

import ModalLayout from '#components/ui/layout/modal-layout'

/**
 * Maintenance Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function MaintenanceLayout({
	children,
	modal
}: LayoutProps<'/maintenance'>) {
	return <ModalLayout modal={modal}>{children}</ModalLayout>
}
