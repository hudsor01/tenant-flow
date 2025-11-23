import { requireSession } from '#lib/dal'
import { MobileChrome } from '#components/layout/mobile-chrome'
import { PaymentGateWrapper } from '#components/layout/payment-gate-wrapper'
import { Suspense, type ReactNode } from 'react'
import { Skeleton } from '#components/ui/skeleton'

async function ProtectedContent({ children }: { children: ReactNode }) {
	await requireSession()
	return (
		<MobileChrome>
			<PaymentGateWrapper>{children}</PaymentGateWrapper>
		</MobileChrome>
	)
}

export default function ProtectedLayout({
	children
}: {
	children: ReactNode
}) {
	return (
		<Suspense fallback={<div className="flex h-screen items-center justify-center"><Skeleton className="h-96 w-full max-w-4xl" /></div>}>
			<ProtectedContent>{children}</ProtectedContent>
		</Suspense>
	)
}
