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
			<div className="w-full card-elevated-authority rounded-2xl card-padding text-center">
				<div className="mb-6">
					<XCircle className="mx-auto h-16 w-16 text-destructive" />
				</div>

				<h1 className="text-3xl font-bold mb-4 text-gradient-authority">
					Payment Cancelled
				</h1>

				<p className="text-muted-foreground mb-8">
					Your payment was cancelled and no charges have been made to your
					account. You can try again whenever you're ready.
				</p>

				<div className="space-y-4">
					<Link
						href="/pricing"
						className="block w-full btn-gradient-primary py-3 px-6 rounded-lg font-medium hover:brightness-110 transition"
					>
						Try Again
					</Link>

					<Link
						href="/"
						className="block w-full border py-3 px-6 rounded-lg font-medium hover:bg-accent transition-colors"
					>
						Back to Home
					</Link>
				</div>

				<div className="mt-8 pt-6 border-t border-border">
					<div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
						<MessageCircle className="w-4 h-4" />
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
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-destructive"></div>
				</PageLayout>
			}
		>
			<CancelContent />
		</Suspense>
	)
}
