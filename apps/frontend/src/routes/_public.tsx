import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

export const Route = createFileRoute('/_public')({
	component: PublicLayoutRoute,
})

function PublicLayoutRoute() {
	return (
		<MarketingLayout>
			<Outlet />
		</MarketingLayout>
	)
}