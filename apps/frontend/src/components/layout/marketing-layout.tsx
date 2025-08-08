import type { ReactNode } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Breadcrumbs } from '@/components/seo/breadcrumbs'

interface MarketingLayoutProps {
	children: ReactNode
	transparent?: boolean
	showBreadcrumbs?: boolean
	className?: string
}

/**
 * Layout for public marketing pages (landing, pricing, blog, etc.)
 * Provides consistent navigation and optional breadcrumb
 */
export function MarketingLayout({
	children,
	transparent = false,
	showBreadcrumbs = true,
	className = ''
}: MarketingLayoutProps) {
	return (
		<div
			className={`bg-background text-foreground flex min-h-screen flex-col ${className}`}
		>
			<Navigation context="public" transparent={transparent} />

			{showBreadcrumbs && <Breadcrumbs items={[]} showHome={true} />}

			<main className="flex-1">{children}</main>
		</div>
	)
}
