export const APP_CONFIG = {
  name: 'TenantFlow',
  description: 'Modern property management platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app',
  copyright: `© ${new Date().getFullYear()} TenantFlow. All rights reserved.`,
  auth: {
    redirectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '/auth/callback' : '/login'
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tenantflow.app'
  },
  features: {
    registration: true,
    socialAuth: true,
    emailVerification: true
  }
} as const

export const appConfig = APP_CONFIG
export type AppConfig = typeof APP_CONFIG