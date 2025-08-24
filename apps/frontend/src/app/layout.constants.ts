import type { Metadata } from 'next/types'

// Local Viewport type definition since it's not exported from Next.js
export interface Viewport {
	width?: string | number
	height?: string | number
	initialScale?: number
	maximumScale?: number
	minimumScale?: number
	userScalable?: boolean
	viewportFit?: 'auto' | 'contain' | 'cover'
	themeColor?: string | { color: string; media?: string }[]
}

export const LAYOUT_CONSTANTS = {
	SIDEBAR_WIDTH: 256,
	HEADER_HEIGHT: 64,
	MOBILE_BREAKPOINT: 768,
	DESKTOP_BREAKPOINT: 1024
} as const

export type LayoutConstants = typeof LAYOUT_CONSTANTS

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'
	),
	title: 'TenantFlow',
	description: 'Modern property management platform'
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1
}
