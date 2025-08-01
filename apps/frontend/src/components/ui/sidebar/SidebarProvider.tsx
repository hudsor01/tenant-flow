import * as React from 'react'
import { cn } from '@/lib/utils/css.utils'
import { useIsMobile } from '@/hooks/useMobile'
import type { SidebarContextProps } from '@/lib/sidebar-utils'
import { SidebarContext } from '@/lib/sidebar-utils'
import {
	SIDEBAR_KEYBOARD_SHORTCUT,
	SIDEBAR_COOKIE_NAME,
	SIDEBAR_COOKIE_MAX_AGE
} from './constants'

const SidebarProvider = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<'div'> & {
		defaultOpen?: boolean
		open?: boolean
		onOpenChange?: (open: boolean) => void
	}
>(
	(
		{
			defaultOpen = true,
			open: openProp,
			onOpenChange: setOpenProp,
			className,
			style,
			children,
			...props
		},
		ref
	) => {
		const isMobile = useIsMobile()
		const [openMobile, setOpenMobile] = React.useState(false)

		// This is the internal state of the sidebar.
		// We use openProp and setOpenProp for control from outside the component.
		const [_open, _setOpen] = React.useState(defaultOpen)
		const open = openProp ?? _open
		const setOpen = React.useCallback(
			(value: boolean | ((value: boolean) => boolean)) => {
				const openState =
					typeof value === 'function' ? value(open) : value
				if (setOpenProp) {
					setOpenProp(openState)
				} else {
					_setOpen(openState)
				}

				// This sets the cookie to keep the sidebar state.
				document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
			},
			[setOpenProp, open]
		)

		// Helper to toggle the sidebar.
		const toggleSidebar = React.useCallback(() => {
			return isMobile
				? setOpenMobile(open => !open)
				: setOpen(open => !open)
		}, [isMobile, setOpen, setOpenMobile])

		// Adds a keyboard shortcut to toggle the sidebar.
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

		// We add a state so that we can do data-state="expanded" or "collapsed".
		// This makes it easier to style the sidebar with Tailwind classes.
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
				<div
					style={
						{
							'--sidebar-width': 'var(--sidebar-width-desktop)',
							'--sidebar-width-icon': 'var(--sidebar-width-icon)',
							...style
						} as React.CSSProperties
					}
					className={cn(
						'group/sidebar-wrapper has-[[data-variant=inset]]:bg-sidebar flex min-h-svh w-full',
						className
					)}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</SidebarContext.Provider>
		)
	}
)
SidebarProvider.displayName = 'SidebarProvider'

export { SidebarProvider }
