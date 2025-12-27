import Footer from '#components/layout/footer'
import { Navbar } from '#components/layout/navbar'
import { GridPattern } from '#components/ui/grid-pattern'
import { cn } from '#lib/utils'
import type { ReactNode } from 'react'

interface PageLayoutProps {
	children: ReactNode
	/** Show the marketing navbar. Default: true */
	showNavbar?: boolean
	/** Show the marketing footer. Default: true */
	showFooter?: boolean
	/** Show the grid pattern background. Default: true */
	showGridPattern?: boolean
	/** Additional classes for the main content area */
	containerClass?: string
	/** Additional classes for the root wrapper */
	className?: string
}

/**
 * Marketing Page Layout
 *
 * Provides consistent structure for all marketing pages:
 * - GridPattern background
 * - Navbar with page-offset-navbar spacing
 * - Footer
 *
 * Usage:
 * ```tsx
 * <PageLayout>
 *   <section className="section-spacing">...</section>
 * </PageLayout>
 * ```
 */
export function PageLayout({
	children,
	showNavbar = true,
	showFooter = true,
	showGridPattern = true,
	containerClass,
	className
}: PageLayoutProps) {
	return (
		<div
			className={cn(
				'relative min-h-screen flex flex-col marketing-page',
				className
			)}
		>
			{showGridPattern && <GridPattern patternId="page-layout-grid" className="fixed inset-0 -z-10" />}
			{showNavbar && <Navbar />}
			<main
				className={cn(
					'flex-1',
					showNavbar && 'page-offset-navbar',
					containerClass
				)}
			>
				{children}
			</main>
			{showFooter && <Footer />}
		</div>
	)
}

export default PageLayout
