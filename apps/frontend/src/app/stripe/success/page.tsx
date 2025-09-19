import { PageLayout } from '@/components/layout/page-layout'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
	return (
		<PageLayout
			showNavbar={false}
			className="gradient-authority"
			containerClass="flex items-center justify-center min-h-screen max-w-md"
		>
			<div className="w-full card-elevated-authority rounded-2xl card-padding text-center">
				<div className="mb-6">
					<CheckCircle className="mx-auto h-16 w-16 text-primary" />
				</div>

				<h1 className="text-3xl font-bold mb-4 text-gradient-authority">
					Welcome to TenantFlow!
				</h1>

				<p className="text-muted-foreground mb-8">
					Your subscription has been activated successfully. You now have access
					to all premium features.
				</p>

				<div className="space-y-4">
					<Link
						href="/dashboard"
						className="block w-full btn-gradient-primary py-3 px-6 rounded-lg font-medium hover:brightness-110 transition"
					>
						Go to Dashboard
					</Link>

					<Link
						href="/"
						className="block w-full border py-3 px-6 rounded-lg font-medium hover:bg-accent transition-colors"
					>
						Back to Home
					</Link>
				</div>

				<div className="mt-8 pt-6 border-t border-border">
					<p className="text-sm text-muted-foreground">
						A confirmation email has been sent to your inbox with your receipt
						and account details.
					</p>
				</div>
			</div>
		</PageLayout>
	)
}

export default function SuccessPage() {
	return (
		<Suspense
			fallback={
				<PageLayout
					showNavbar={false}
					className="gradient-authority"
					containerClass="flex items-center justify-center min-h-screen"
				>
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				</PageLayout>
			}
		>
			<SuccessContent />
		</Suspense>
	)
}
