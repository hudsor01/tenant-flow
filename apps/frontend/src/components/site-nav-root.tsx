'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'


interface SiteNavRootProps {
	/**
	 * Optional list of path prefixes where the marketing Navbar should be hidden
	 * Example: ['/dashboard']
	 */
	hideOnPrefixes?: string[]
}

export function SiteNavRoot({
	hideOnPrefixes = ['/dashboard']
}: SiteNavRootProps) {
	const pathname = usePathname()
	const shouldHide = hideOnPrefixes.some(prefix => pathname?.startsWith(prefix))

	// Avoid duplicate navbars: only render if none exists already
	const [shouldRender, setShouldRender] = React.useState(false)
	React.useEffect(() => {
		if (shouldHide) {
			setShouldRender(false)
			return
		}
		// Defer to ensure page-level navbars mount first
		const id = requestAnimationFrame(() => {
			const existing = document.querySelector('[data-site-navbar]')
			setShouldRender(!existing)
		})
		return () => cancelAnimationFrame(id)
	}, [shouldHide, pathname])

	if (!shouldRender) return null
	return <Navbar />
}

export default SiteNavRoot
