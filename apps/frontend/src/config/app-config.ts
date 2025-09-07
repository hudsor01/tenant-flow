export const APP_CONFIG = {
  name: 'TenantFlow',
  description: 'Modern property management platform',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  copyright: `© ${new Date().getFullYear()} TenantFlow. All rights reserved.`,
  auth: {
    redirectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '/auth/callback' : '/login'
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  },
  features: {
    registration: true,
    socialAuth: true,
    emailVerification: true
  }
} as const

export const appConfig = APP_CONFIG
export type AppConfig = typeof APP_CONFIG