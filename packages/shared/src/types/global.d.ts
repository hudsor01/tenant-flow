// Global type declarations for TenantFlow frontend

import type { PostHog } from 'posthog-js'

declare global {
  interface Window {
    posthog?: PostHog
  }
}

export {}