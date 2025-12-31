/**
 * Server-side Sidebar Provider Wrapper
 *
 * Reads sidebar state from cookies on the server to prevent SSR hydration mismatches.
 * Passes the initial state to the client SidebarProvider.
 */

import { cookies } from 'next/headers'
import { SidebarProvider } from '#components/ui/sidebar/context'
import type { ReactNode } from 'react'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

interface ServerSidebarProviderProps {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
	style?: React.CSSProperties
	children: ReactNode
}

/**
 * Server component that reads sidebar cookie and provides initial state
 * to prevent SSR hydration mismatches.
 */
export async function ServerSidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: ServerSidebarProviderProps) {
	// Read cookie on server
	let initialOpen = defaultOpen
	try {
		const cookieStore = await cookies()
		const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value

		// Parse cookie value, fallback to defaultOpen
		if (sidebarCookie) {
			// Only accept 'true' or 'false' as valid values
			if (sidebarCookie === 'true') {
				initialOpen = true
			} else if (sidebarCookie === 'false') {
				initialOpen = false
			}
			// If cookie exists but has invalid value, keep defaultOpen
		}
	} catch {
		// If cookies API fails, use defaultOpen
		initialOpen = defaultOpen
	}

	// Use cookie value as defaultOpen, but allow explicit open prop to override
	const effectiveDefaultOpen = openProp !== undefined ? openProp : initialOpen

	return (
		<SidebarProvider
			defaultOpen={effectiveDefaultOpen}
			{...(openProp !== undefined && { open: openProp })}
			{...(setOpenProp !== undefined && { onOpenChange: setOpenProp })}
			{...(className !== undefined && { className })}
			{...(style !== undefined && { style })}
			{...props}
		>
			{children}
		</SidebarProvider>
	)
}
