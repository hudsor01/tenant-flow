import ModalLayout from '#components/ui/layout/modal-layout'

/**
 * Tenants Layout with Modal Slot
 *
 * Enables intercepting routes for modal-based navigation.
 * Next.js 16: Using LayoutProps for automatic typing of parallel routes
 */
export default function TenantsLayout({
	children,
	modal
}: LayoutProps<'/tenants'>) {
	return <ModalLayout modal={modal}>{children}</ModalLayout>
}
