

import ModalLayout from '#components/ui/layout/modal-layout'

/**
 * Properties Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation:
 * - Click "New Property" from list → Modal overlay
 * - Click "Edit" from list → Modal overlay
 * - Direct navigation or refresh → Full page
 *
 * The @modal slot is rendered in parallel with children.
 */
export default function PropertiesLayout({
	children,
	modal
}: LayoutProps<'/properties'>) {
	return <ModalLayout modal={modal}>{children}</ModalLayout>
}
