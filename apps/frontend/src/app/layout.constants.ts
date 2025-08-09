import type { Metadata, Viewport } from 'next'

export const LAYOUT_CONSTANTS = {
  SIDEBAR_WIDTH: 256,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  DESKTOP_BREAKPOINT: 1024,
} as const

export type LayoutConstants = typeof LAYOUT_CONSTANTS

export const metadata: Metadata = {
  title: 'TenantFlow',
  description: 'Modern property management platform',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}