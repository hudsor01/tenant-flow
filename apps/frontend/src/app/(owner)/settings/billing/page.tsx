import { BillingManagement } from '#components/billing/billing-management'
import { PaymentMethodDisplay } from '#components/billing/payment-method-display'

/**
 * Billing Settings Page
 *
 * Allows property owners to manage their Stripe subscription and payment methods
 *
 * Features:
 * - View current payment methods (read-only)
 * - Manage billing via Stripe Customer Portal (redirects to Stripe)
 * - View subscription status
 *
 * Security:
 * - RLS enforces users can only see their own payment methods
 * - Billing portal sessions are user-specific and expire after 1 hour
 * - Customer ownership verified on backend before portal access
 */
export default function BillingSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing Settings</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current payment methods */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
        <PaymentMethodDisplay />
      </div>

      {/* Manage billing button */}
      <BillingManagement />
    </div>
  )
}
