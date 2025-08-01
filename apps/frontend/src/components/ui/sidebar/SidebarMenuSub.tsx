import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils/css.utils'

const SidebarMenuSub = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
	<ul
		ref={ref}
		data-sidebar="menu-sub"
		className={cn(
			'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
			'group-data-[collapsible=icon]:hidden',
			className
		)}
		{...props}
	/>
))
SidebarMenuSub.displayName = 'SidebarMenuSub'

const SidebarMenuSubItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<'li'>
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

const sidebarMenuSubButtonVariants = cva(
	'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
	{
		variants: {
			size: {
				sm: 'text-xs',
				md: 'text-sm'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
)

const SidebarMenuSubButton = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentProps<'a'> & {
		asChild?: boolean
		size?: 'sm' | 'md'
		isActive?: boolean
	} & VariantProps<typeof sidebarMenuSubButtonVariants>
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			ref={ref}
			data-sidebar="menu-sub-button"
			data-size={size}
			data-active={isActive}
			className={cn(
				sidebarMenuSubButtonVariants({ size }),
				'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
				'group-data-[collapsible=icon]:hidden',
				className
			)}
			{...props}
		/>
	)
})
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'

export { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton }
