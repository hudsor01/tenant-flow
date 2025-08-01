import * as React from 'react'
import { cn } from '@/lib/utils/css.utils'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const SidebarRail = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'>
>(({ className, ...props }, ref) => {
	return (
		<button
			ref={ref}
			data-sidebar="rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			className={cn(
				'after:bg-sidebar-border hover:after:bg-sidebar-accent absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 sm:flex',
				'[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
				'[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
				'group-data-[collapsible=offcanvas]:hover:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
				'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
				'[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
				className
			)}
			{...props}
		/>
	)
})
SidebarRail.displayName = 'SidebarRail'

const SidebarInset = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<'div'>
>(({ className, ...props }, ref) => {
	return (
		<main
			ref={ref}
			className={cn(
				'bg-background relative flex min-h-svh flex-1 flex-col',
				'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2',
				className
			)}
			{...props}
		/>
	)
})
SidebarInset.displayName = 'SidebarInset'

const SidebarInput = React.forwardRef<
	React.ElementRef<typeof Input>,
	React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
	return (
		<Input
			ref={ref}
			data-sidebar="input"
			className={cn(
				'bg-background focus-visible:ring-sidebar-ring h-8 w-full shadow-none focus-visible:ring-2',
				className
			)}
			{...props}
		/>
	)
})
SidebarInput.displayName = 'SidebarInput'

const SidebarSeparator = React.forwardRef<
	React.ElementRef<typeof Separator>,
	React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
	return (
		<Separator
			ref={ref}
			data-sidebar="separator"
			className={cn('bg-sidebar-border mx-2 w-auto', className)}
			{...props}
		/>
	)
})
SidebarSeparator.displayName = 'SidebarSeparator'

export { SidebarRail, SidebarInset, SidebarInput, SidebarSeparator }
