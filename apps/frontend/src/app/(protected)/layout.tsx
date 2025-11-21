import { requireSession } from '#lib/server-auth'
import { MobileChrome } from '#components/layout/mobile-chrome'
import { PaymentGateWrapper } from '#components/layout/payment-gate-wrapper'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	await requireSession()
	return (
		<MobileChrome>
			<PaymentGateWrapper>{children}</PaymentGateWrapper>
		</MobileChrome>
	)
}
