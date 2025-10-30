/**
 * ULTRA-NATIVE Email Templates
 * Simple HTML templates using native template literals
 * No complex service layers or abstractions
 */

export interface EmailParams {
  to: string
  customerName?: string
  subscriptionId?: string
  planName?: string
  amount?: number
  currency?: string
  interval?: 'month' | 'year'
  nextBillingDate?: string
  trialEndDate?: string
  failureReason?: string
}

export const emailTemplates = {
  subscriptionCreated: (params: EmailParams) => ({
    to: params.to,
    subject: `Welcome to ${params.planName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to TenantFlow!</h2>
        <p>Hi ${params.customerName || 'there'},</p>
        <p>Your ${params.planName} subscription has been activated successfully.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Plan:</strong> ${params.planName}</p>
          <p><strong>Amount:</strong> ${(params.amount! / 100).toFixed(2)} ${params.currency!.toUpperCase()}/${params.interval}</p>
          ${params.nextBillingDate ? `<p><strong>Next billing:</strong> ${params.nextBillingDate}</p>` : ''}
        </div>
        <p><a href="https://tenantflow.app/manage" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
        <p>Thanks for choosing TenantFlow!</p>
      </div>
    `
  }),

  subscriptionCancelled: (params: EmailParams) => ({
    to: params.to,
    subject: 'Subscription Cancelled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Cancelled</h2>
        <p>Hi ${params.customerName || 'there'},</p>
        <p>Your ${params.planName} subscription has been cancelled.</p>
        <p>You'll continue to have access until your current billing period ends.</p>
        <p>If you change your mind, you can reactivate anytime from your dashboard.</p>
        <p><a href="https://tenantflow.app/settings/billing">Manage Billing</a></p>
      </div>
    `
  }),

  paymentFailed: (params: EmailParams) => ({
    to: params.to,
    subject: 'Payment Failed - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Failed</h2>
        <p>Hi ${params.customerName || 'there'},</p>
        <p>We couldn't process your payment for ${params.planName}.</p>
        ${params.failureReason ? `<p><strong>Reason:</strong> ${params.failureReason}</p>` : ''}
        <p>Please update your payment method to continue using TenantFlow.</p>
        <p><a href="https://tenantflow.app/settings/billing" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a></p>
      </div>
    `
  }),

  trialEndingSoon: (params: EmailParams) => ({
    to: params.to,
    subject: 'Your Trial Ends Soon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Trial Ends Soon</h2>
        <p>Hi ${params.customerName || 'there'},</p>
        <p>Your free trial ends on ${params.trialEndDate}.</p>
        <p>Upgrade to ${params.planName} to continue using TenantFlow without interruption.</p>
        <p><a href="https://tenantflow.app/pricing" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Upgrade Now</a></p>
      </div>
    `
  })
}