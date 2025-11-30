

import ModalLayout from '#components/ui/layout/modal-layout'

/**
 * Leases Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 */
export default function LeasesLayout({
	children,
	modal
}: LayoutProps<'/leases'>) {
	return <ModalLayout modal={modal}>{children}</ModalLayout>
}
