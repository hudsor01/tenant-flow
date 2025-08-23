'use client'

/**
 * Sidebar Provider - Client Component
 *
 * Focused client component for sidebar state management
 * Handles responsive behavior, keyboard shortcuts, and persistence
 */

import * as React from 'react'
// Inline mobile detection (removed use-mobile dependency)
function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(false)
	
	React.useEffect(() => {
		const mediaQuery = window.matchMedia('(max-width: 768px)')
		setIsMobile(mediaQuery.matches)
		
		const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])
	
	return isMobile
}
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
// import {
//   SIDEBAR_COOKIE_NAME,
//   SIDEBAR_COOKIE_MAX_AGE,
//   SIDEBAR_WIDTH,
//   SIDEBAR_WIDTH_ICON,
//   SIDEBAR_KEYBOARD_SHORTCUT
// } from "./sidebar/constants"

// Inline constants to avoid import errors
const SIDEBAR_COOKIE_NAME = 'sidebar:state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH = '16rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

interface SidebarContextProps {
	state: 'expanded' | 'collapsed'
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	isMobile: boolean
	toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
	const context = React.useContext(SidebarContext)
	if (!context) {
		throw new Error('useSidebar must be used within a SidebarProvider.')
	}
	return context
}

interface SidebarProviderProps extends React.ComponentProps<'div'> {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: SidebarProviderProps) {
	const isMobile = useIsMobile()
	const [openMobile, setOpenMobile] = React.useState(false)

	// Internal state management
	const [_open, _setOpen] = React.useState(defaultOpen)
	const open = openProp ?? _open

	const setOpen = React.useCallback(
		(value: boolean | ((value: boolean) => boolean)) => {
			const openState = typeof value === 'function' ? value(open) : value
			if (setOpenProp) {
				setOpenProp(openState)
			} else {
				_setOpen(openState)
			}

			// Persist state in cookie
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
		},
		[setOpenProp, open]
	)

	// Toggle functionality
	const toggleSidebar = React.useCallback(() => {
		return isMobile ? setOpenMobile(open => !open) : setOpen(open => !open)
	}, [isMobile, setOpen, setOpenMobile])

	// Keyboard shortcut handling
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault()
				toggleSidebar()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [toggleSidebar])

	const state = open ? 'expanded' : 'collapsed'

	const contextValue = React.useMemo<SidebarContextProps>(
		() => ({
			state,
			open,
			setOpen,
			isMobile,
			openMobile,
			setOpenMobile,
			toggleSidebar
		}),
		[
			state,
			open,
			setOpen,
			isMobile,
			openMobile,
			setOpenMobile,
			toggleSidebar
		]
	)

	return (
		<SidebarContext.Provider value={contextValue}>
			<TooltipProvider delayDuration={0}>
				<div
					data-slot="sidebar-wrapper"
					style={
						{
							'--sidebar-width': SIDEBAR_WIDTH,
							'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
							...style
						} as React.CSSProperties
					}
					className={cn(
						'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
						className
					)}
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</SidebarContext.Provider>
	)
}
