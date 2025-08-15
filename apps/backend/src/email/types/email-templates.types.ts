import { z } from 'zod'

// Email template names as const assertion for type safety
export const EmailTemplateNames = [
  'welcome',
  'tenant-invitation',
  'payment-reminder', 
  'lease-expiration',
  'property-tips',
  'feature-announcement',
  'day3-education',
  'day7-demo',
  're-engagement'
] as const

export type EmailTemplateName = typeof EmailTemplateNames[number]

// Zod schemas for runtime validation
export const WelcomeEmailDataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companySize: z.enum(['small', 'medium', 'large']).default('medium'),
  source: z.string().default('organic')
})

export const TenantInvitationDataSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  invitationLink: z.string().url('Must be a valid URL'),
  landlordName: z.string().min(1, 'Landlord name is required')
})

export const PaymentReminderDataSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  amountDue: z.number().positive('Amount must be positive'),
  dueDate: z.date(),
  propertyAddress: z.string().min(1, 'Property address is required'),
  paymentLink: z.string().url('Must be a valid URL')
})

export const LeaseExpirationDataSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  expirationDate: z.date(),
  renewalLink: z.string().url('Must be a valid URL'),
  leaseId: z.string().optional()
})

export const PropertyTipsDataSchema = z.object({
  landlordName: z.string().min(1, 'Landlord name is required'),
  tips: z.array(z.string().min(1)).min(1, 'At least one tip is required')
})

export const FeatureAnnouncementDataSchema = z.object({
  userName: z.string().min(1, 'User name is required'),
  features: z.array(z.object({
    title: z.string().min(1, 'Feature title is required'),
    description: z.string().min(1, 'Feature description is required')
  })).min(1, 'At least one feature is required'),
  actionUrl: z.string().url('Must be a valid URL').optional()
})

export const Day3EducationDataSchema = z.object({
  firstName: z.string().min(1, 'First name is required')
})

export const Day7DemoDataSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  demoLink: z.string().url('Must be a valid URL')
})

export const ReEngagementDataSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastActiveDate: z.string().min(1, 'Last active date is required'),
  specialOffer: z.object({
    title: z.string(),
    description: z.string(),
    discount: z.string(),
    expires: z.string()
  }).optional()
})

// Type inference from schemas
export type WelcomeEmailData = z.infer<typeof WelcomeEmailDataSchema>
export type TenantInvitationData = z.infer<typeof TenantInvitationDataSchema>
export type PaymentReminderData = z.infer<typeof PaymentReminderDataSchema>
export type LeaseExpirationData = z.infer<typeof LeaseExpirationDataSchema>
export type PropertyTipsData = z.infer<typeof PropertyTipsDataSchema>
export type FeatureAnnouncementData = z.infer<typeof FeatureAnnouncementDataSchema>
export type Day3EducationData = z.infer<typeof Day3EducationDataSchema>
export type Day7DemoData = z.infer<typeof Day7DemoDataSchema>
export type ReEngagementData = z.infer<typeof ReEngagementDataSchema>

// Discriminated union for type-safe email data
export type EmailData = 
  | { template: 'welcome'; data: WelcomeEmailData }
  | { template: 'tenant-invitation'; data: TenantInvitationData }
  | { template: 'payment-reminder'; data: PaymentReminderData }
  | { template: 'lease-expiration'; data: LeaseExpirationData }
  | { template: 'property-tips'; data: PropertyTipsData }
  | { template: 'feature-announcement'; data: FeatureAnnouncementData }
  | { template: 'day3-education'; data: Day3EducationData }
  | { template: 'day7-demo'; data: Day7DemoData }
  | { template: 're-engagement'; data: ReEngagementData }

// Template configuration interface
export interface EmailTemplateConfig {
  name: EmailTemplateName
  subject: string | ((data: AnyEmailData) => string)
  templateFile: string
  schema: z.ZodSchema
  description: string
  tags?: string[]
}

// Registry of all schemas for runtime validation
export const EmailDataSchemas: Record<EmailTemplateName, z.ZodSchema> = {
  'welcome': WelcomeEmailDataSchema,
  'tenant-invitation': TenantInvitationDataSchema,
  'payment-reminder': PaymentReminderDataSchema,
  'lease-expiration': LeaseExpirationDataSchema,
  'property-tips': PropertyTipsDataSchema,
  'feature-announcement': FeatureAnnouncementDataSchema,
  'day3-education': Day3EducationDataSchema,
  'day7-demo': Day7DemoDataSchema,
  're-engagement': ReEngagementDataSchema
} as const

// Helper type for extracting data type from template name
export type ExtractEmailData<T extends EmailTemplateName> = 
  Extract<EmailData, { template: T }>['data']

// Union type for all email data types
export type AnyEmailData = WelcomeEmailData | TenantInvitationData | PaymentReminderData | 
  LeaseExpirationData | PropertyTipsData | FeatureAnnouncementData | 
  Day3EducationData | Day7DemoData | ReEngagementData