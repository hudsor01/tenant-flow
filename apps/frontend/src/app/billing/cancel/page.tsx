/**
 * Billing Cancel Page - Server Component
 * Handles checkout cancellation with server/client separation
 */

import type { Metadata } from 'next/types'
import {
	BillingLayout,
	generateBillingMetadata
} from '@/components/billing/billing-layout'
import { PaymentCancelled } from '@/components/billing/payment-cancelled'

// Server-side metadata generation
export function generateMetadata(): Metadata {
	const meta = generateBillingMetadata(
		'Checkout Cancelled',
		'Your checkout was cancelled - no charges were made'
	)
	return meta
}

/**
 * Main page component - Server Component
 */
export default function BillingCancelPage() {
	return (
		<BillingLayout
			title="Checkout Cancelled"
			description="Your subscription setup was cancelled. No charges were made."
			showNavigation={false}
		>
			<PaymentCancelled />
		</BillingLayout>
	)
}
