import { 
  Day3EducationDataSchema, 
  Day7DemoDataSchema,
  type EmailTemplateConfig,
  type EmailTemplateName,
  type ExtractEmailData,
  FeatureAnnouncementDataSchema,
  LeaseExpirationDataSchema,
  type PaymentReminderData,
  PaymentReminderDataSchema,
  PropertyTipsDataSchema,
  ReEngagementDataSchema,
  TenantInvitationDataSchema,
  WelcomeEmailDataSchema
} from '../types/email-templates.types'

// Template configurations - centralized and easily extensible
export const EMAIL_TEMPLATES: Record<EmailTemplateName, EmailTemplateConfig> = {
  'welcome': {
    name: 'welcome',
    subject: 'Welcome to TenantFlow - Your Property Management Journey Begins!',
    templateFile: 'welcome.hbs',
    schema: WelcomeEmailDataSchema,
    description: 'Welcome new users to the platform with onboarding information',
    tags: ['onboarding', 'welcome']
  },

  'tenant-invitation': {
    name: 'tenant-invitation',
    subject: "You're Invited to Join Your Property Portal",
    templateFile: 'tenant-invitation.hbs',
    schema: TenantInvitationDataSchema,
    description: 'Invite tenants to access their property portal',
    tags: ['invitation', 'tenant']
  },

  'payment-reminder': {
    name: 'payment-reminder',
    subject: (data: unknown) => {
      const paymentData = data as PaymentReminderData
      return `Rent Payment Reminder - Due ${paymentData.dueDate.toLocaleDateString()}`
    },
    templateFile: 'payment-reminder.hbs',
    schema: PaymentReminderDataSchema,
    description: 'Remind tenants of upcoming rent payments',
    tags: ['payment', 'reminder', 'tenant']
  },

  'lease-expiration': {
    name: 'lease-expiration',
    subject: 'Lease Expiration Notice',
    templateFile: 'lease-expiration.hbs',
    schema: LeaseExpirationDataSchema,
    description: 'Notify tenants of upcoming lease expiration',
    tags: ['lease', 'expiration', 'tenant']
  },

  'property-tips': {
    name: 'property-tips',
    subject: 'Property Management Tips from TenantFlow',
    templateFile: 'property-tips.hbs',
    schema: PropertyTipsDataSchema,
    description: 'Educational content for property managers',
    tags: ['education', 'tips', 'landlord']
  },

  'feature-announcement': {
    name: 'feature-announcement',
    subject: 'New Features Available in TenantFlow!',
    templateFile: 'feature-announcement.hbs',
    schema: FeatureAnnouncementDataSchema,
    description: 'Announce new platform features to users',
    tags: ['product', 'announcement', 'features']
  },

  'day3-education': {
    name: 'day3-education',
    subject: 'Day 3: Advanced Property Management Strategies',
    templateFile: 'day3-education.hbs',
    schema: Day3EducationDataSchema,
    description: 'Third day of onboarding education sequence',
    tags: ['onboarding', 'education', 'sequence']
  },

  'day7-demo': {
    name: 'day7-demo',
    subject: 'Your Personalized TenantFlow Demo is Ready',
    templateFile: 'day7-demo.hbs',
    schema: Day7DemoDataSchema,
    description: 'Demo invitation after one week of usage',
    tags: ['onboarding', 'demo', 'sequence']
  },

  're-engagement': {
    name: 're-engagement',
    subject: "We Miss You at TenantFlow!",
    templateFile: 're-engagement.hbs',
    schema: ReEngagementDataSchema,
    description: 'Re-engage inactive users with special offers',
    tags: ['retention', 'engagement', 'winback']
  }
} as const

// Helper functions for working with template configs
export function getTemplateConfig(templateName: EmailTemplateName): EmailTemplateConfig {
  const config = EMAIL_TEMPLATES[templateName]
  if (!config) {
    throw new Error(`Template configuration not found for: ${templateName}`)
  }
  return config
}

export function getAllTemplateNames(): EmailTemplateName[] {
  return Object.keys(EMAIL_TEMPLATES) as EmailTemplateName[]
}

export function getTemplatesByTag(tag: string): EmailTemplateConfig[] {
  return Object.values(EMAIL_TEMPLATES).filter(config => 
    config.tags?.includes(tag)
  )
}

export function generateSubject<T extends EmailTemplateName>(templateName: T, data: ExtractEmailData<T>): string {
  const config = getTemplateConfig(templateName)
  
  if (typeof config.subject === 'function') {
    return config.subject(data)
  }
  
  return config.subject
}