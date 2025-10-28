import { Button } from '#components/ui/button'
import { PageLayout } from '#components/layout/page-layout'
import { MessageCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function CancelContent() {
	return (
		<PageLayout
			showNavbar={false}
			className="gradient-authority"
			containerClass="flex items-center justify-center min-h-screen max-w-md"
		>
			<div className="w-full shadow-md bg-card/50 border border-border backdrop-blur-sm rounded-2xl p-8 text-center">
				<div className="mb-6">
					<XCircle className="mx-auto size-16 text-destructive" />
				</div>

				<h1 className="text-3xl font-bold mb-4 text-gradient-authority">
					Payment Cancelled
				</h1>

				<p className="text-muted-foreground mb-8">
					Your payment was cancelled and no charges have been made to your
					account. You can try again whenever you&apos;re ready.
				</p>

				<div className="space-y-4">
					<Button asChild className="w-full" size="lg">
						<Link href="/pricing">Try Again</Link>
					</Button>

					<Button asChild variant="outline" className="w-full" size="lg">
						<Link href="/">Back to Home</Link>
					</Button>
				</div>

				<div className="mt-8 pt-6 border-t border-border">
					<div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
						<MessageCircle className="size-4" />
						<span>Need help? Contact our support team</span>
					</div>
				</div>
			</div>
		</PageLayout>
	)
}

export default function CancelPage() {
	return (
		<Suspense
			fallback={
				<PageLayout
					showNavbar={false}
					className="gradient-authority"
					containerClass="flex items-center justify-center min-h-screen"
				>
					<div className="animate-spin rounded-full size-12 border-b-2 border-destructive"></div>
				</PageLayout>
			}
		>
			<CancelContent />
		</Suspense>
	)
}
