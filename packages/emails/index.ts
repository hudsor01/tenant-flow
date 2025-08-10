// Centralized email template exports
export { default as EmailConfirmation } from './email-confirmation'
export { default as WelcomeEmail } from './welcome-series'
export { default as TenantInvitation } from './tenant-invitation'
export { default as PaymentReminder } from './payment-reminder'
export { default as LeaseExpirationAlert } from './lease-expiration-alert'
export { default as PropertyTips } from './property-tips'
export { default as FeatureAnnouncement } from './feature-announcement'
export { default as Day3Education } from './day3-education'
export { default as Day7DemoInvitation } from './day7-demo-invitation'
export { default as ReEngagement } from './re-engagement'

// Email template types
export interface EmailTemplateProps {
  to: string
  subject: string
  template: string
  props: Record<string, string | number | boolean | null | undefined>
}

// Email template registry
export const EMAIL_TEMPLATES = {
  EMAIL_CONFIRMATION: 'email-confirmation',
  WELCOME: 'welcome-series',
  TENANT_INVITATION: 'tenant-invitation',
  PAYMENT_REMINDER: 'payment-reminder',
  LEASE_EXPIRATION: 'lease-expiration-alert',
  PROPERTY_TIPS: 'property-tips',
  FEATURE_ANNOUNCEMENT: 'feature-announcement',
  DAY3_EDUCATION: 'day3-education',
  DAY7_DEMO: 'day7-demo-invitation',
  RE_ENGAGEMENT: 're-engagement'
} as const

export type EmailTemplate = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES]