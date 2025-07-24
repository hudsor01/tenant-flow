import { createFileRoute } from '@tanstack/react-router'
import { FreeTrialCheckout } from '@/components/billing/checkout/FreeTrialCheckout'
import { Shell } from '@/components/layout/Shell'
import { logger } from '@/lib/logger'

export const Route = createFileRoute('/pricing/instant-trial')({
  component: InstantTrialPage,
})

function InstantTrialPage() {
  const handleTrialSuccess = (subscriptionId: string) => {
    logger.info('Trial created successfully', undefined, { subscriptionId })
    // You could track this event, show a notification, etc.
  }

  return (
    <Shell>
      <div className="container mx-auto py-12 px-4">
        <FreeTrialCheckout onSuccess={() => handleTrialSuccess('trial-started')} />
      </div>
    </Shell>
  )
}