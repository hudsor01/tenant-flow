/**
 * Billing Success Page - Server Component
 * Handles post-checkout success flow with proper server/client separation
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import { BillingLayout, generateBillingMetadata } from '@/components/billing/billing-layout'
import { PaymentSuccess } from '@/components/billing/payment-success'
import { verifyCheckoutSession } from '@/lib/actions/billing-actions'

interface BillingSuccessPageProps {
  searchParams: { session_id?: string }
}

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return generateBillingMetadata(
    'Payment Success',
    'Your subscription has been activated successfully'
  )
}

/**
 * Server Component - Load subscription data server-side
 */
async function BillingSuccessContent({ sessionId }: { sessionId?: string }) {
  // Fetch subscription data server-side
  const { subscription, error } = await verifyCheckoutSession(sessionId)

  return (
    <PaymentSuccess 
      subscriptionData={subscription}
      sessionId={sessionId}
      isLoading={false}
      error={error}
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
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-lg text-muted-foreground">Activating your subscription...</p>
      </div>
    </div>
  )
}

/**
 * Main page component - Server Component with Suspense
 */
export default function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
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
      <div className="mt-8 text-center p-6 rounded-lg bg-muted/30">
        <p className="text-muted-foreground mb-4">
          Need help getting started? Our team is here to help you succeed.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href="/docs/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            View Documentation
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="/support"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Contact Support
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="/book-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Book a Demo
          </a>
        </div>
      </div>
    </BillingLayout>
  )
}