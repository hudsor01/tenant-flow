import { Button } from '@/components/ui/button'
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
			<div className="w-full shadow-md bg-card/50 border border-border backdrop-blur-sm rounded-2xl p-8 text-center">
				<div className="mb-6">
					<CheckCircle className="mx-auto size-16 text-primary" />
				</div>

				<h1 className="text-3xl font-bold mb-4 text-gradient-authority">
					Welcome to TenantFlow!
				</h1>

				<p className="text-muted-foreground mb-8">
					Your subscription has been activated successfully. You now have access
					to all premium features.
				</p>

				<div className="space-y-4">
					<Button asChild className="w-full" size="lg">
						<Link href="/dashboard">Go to Dashboard</Link>
					</Button>

					<Button asChild variant="outline" className="w-full" size="lg">
						<Link href="/">Back to Home</Link>
					</Button>
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
					<div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
				</PageLayout>
			}
		>
			<SuccessContent />
		</Suspense>
	)
}
