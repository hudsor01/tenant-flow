/**
 * Billing Success Page - Server Component
 * Handles post-checkout success flow with proper server/client separation
 */

import { Suspense } from 'react'
import type { Metadata } from 'next/types'
import { Loader2 } from 'lucide-react'
import {
	BillingLayout,
	generateBillingMetadata
} from '@/components/billing/billing-layout'
import { PaymentSuccess } from '@/components/billing/payment-success'

interface BillingSuccessPageProps {
	searchParams: { session_id?: string }
}

// Server-side metadata generation
<<<<<<< HEAD
export function generateMetadata(): Metadata {
	// Cast the helper's return to Next's Metadata type to satisfy the expected type.
	// Using `await` is safe whether the helper is sync or async.
	const meta = generateBillingMetadata(
		'Payment Success',
		'Your subscription has been activated successfully'
	)
	return meta
=======
export async function generateMetadata(): Promise<Metadata> {
	// Cast the helper's return to Next's Metadata type to satisfy the expected type.
	// Using `await` is safe whether the helper is sync or async.
	const meta = await generateBillingMetadata(
		'Payment Success',
		'Your subscription has been activated successfully'
	)
	return meta as unknown as Metadata
>>>>>>> origin/main
}

/**
 * Server Component - Load subscription data server-side
 */
<<<<<<< HEAD
function BillingSuccessContent({ sessionId }: { sessionId?: string }) {
=======
async function BillingSuccessContent({ sessionId }: { sessionId?: string }) {
>>>>>>> origin/main
	// For now, we'll pass through the session ID and let the client component handle verification
	// This avoids the Supabase Edge Runtime issue during build
	return (
		<PaymentSuccess
			subscriptionData={null}
			sessionId={sessionId}
			isLoading={false}
			error={null}
		/>
	)
}

/**
 * Loading component for Suspense boundary
 */
function BillingSuccessLoading() {
	return (
		<div className="flex items-center justify-center py-16">
			<div className="text-center">
				<Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
				<p className="text-muted-foreground text-lg">
					Activating your subscription...
				</p>
			</div>
		</div>
	)
}

/**
 * Main page component - Server Component with Suspense
 */
export default function BillingSuccessPage({
	searchParams
}: BillingSuccessPageProps) {
	const sessionId = searchParams.session_id

	return (
		<BillingLayout
			title="Payment Successful"
			description="Your subscription has been activated and is ready to use"
			showNavigation={false}
		>
			<Suspense fallback={<BillingSuccessLoading />}>
				<BillingSuccessContent sessionId={sessionId} />
			</Suspense>

			{/* Support Section */}
			<div className="bg-muted/30 mt-8 rounded-lg p-6 text-center">
				<p className="text-muted-foreground mb-4">
					Need help getting started? Our team is here to help you
					succeed.
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					<a
						href="/docs/getting-started"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary font-medium hover:underline"
					>
						View Documentation
					</a>
					<span className="text-muted-foreground">•</span>
					<a
						href="/support"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary font-medium hover:underline"
					>
						Contact Support
					</a>
					<span className="text-muted-foreground">•</span>
					<a
						href="/book-demo"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary font-medium hover:underline"
					>
						Book a Demo
					</a>
				</div>
			</div>
		</BillingLayout>
	)
}
