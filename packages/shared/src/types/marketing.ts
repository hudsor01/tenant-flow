/**
 * Marketing and landing page component types
 * These are marketing-specific UI component types
 */

import type * as React from 'react'

export interface HeroImageSectionProps {
	title: React.ReactNode
	subtitle?: React.ReactNode
	primaryCta?: { label: string; href: string }
	secondaryCta?: { label: string; href: string }
	features?: string[]
	imageUrl?: string
	imageAlt?: string
	className?: string
	[key: string]: unknown
}
