import type { Metadata } from 'next'
import CompleteClient from './complete-client'

// Stripe-checkout result page — verifies session and shows status. No SEO
// value, indistinguishable from `/pricing/success` to a crawler. robots.ts
// also disallows it for defense in depth.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
}

export default function CompletePage() {
	return <CompleteClient />
}
