import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-utils'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import {
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_MOBILE,
	SIDEBAR_WIDTH_ICON
} from './constants'

const sidebarVariants = cva(
	'group flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
	{
		variants: {
			variant: {
				sidebar: 'h-svh',
				floating: 'h-svh p-2',
				inset: 'h-svh bg-background'
			},
			side: {
				left: '',
				right: 'border-l border-r-0'
			}
		},
		defaultVariants: {
			side: 'left',
			variant: 'sidebar'
		}
	}
)

const Sidebar = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<'div'> & {
		side?: 'left' | 'right'
		variant?: 'sidebar' | 'floating' | 'inset'
		collapsible?: 'offcanvas' | 'icon' | 'none'
	} & VariantProps<typeof sidebarVariants>
>(
	(
		{
			side = 'left',
			variant = 'sidebar',
			collapsible = 'offcanvas',
			className,
			children,
			...props
		},
		ref
	) => {
		const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

		if (collapsible === 'none') {
			return (
				<div
					className={cn(
						sidebarVariants({ side, variant }),
						className
					)}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			)
		}

		if (isMobile) {
			return (
				<Sheet
					open={openMobile}
					onOpenChange={setOpenMobile}
					{...props}
				>
					<SheetContent
						data-sidebar="sidebar"
						data-mobile="true"
						className="bg-sidebar text-sidebar-foreground w-[--sidebar-width] p-0 [&>button]:hidden"
						style={
							{
								'--sidebar-width': SIDEBAR_WIDTH_MOBILE
							} as React.CSSProperties
						}
						side={side}
					>
						<SheetHeader className="sr-only">
							<SheetTitle>Navigation</SheetTitle>
							<SheetDescription>
								Navigate through the application
							</SheetDescription>
						</SheetHeader>
						<div
							className={cn(
								sidebarVariants({ side, variant }),
								'h-full'
							)}
						>
							{children}
						</div>
					</SheetContent>
				</Sheet>
			)
		}

		return (
			<div
				ref={ref}
				className="group peer text-sidebar-foreground hidden md:block"
				data-state={state}
				data-collapsible={state === 'collapsed' ? collapsible : ''}
				data-variant={variant}
				data-side={side}
			>
				{/* This is what handles the sidebar gap on desktop */}
				<div
					className={cn(
						'relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear',
						'group-data-[collapsible=offcanvas]:w-0',
						'group-data-[side=right]:rotate-180',
						variant === 'floating' || variant === 'inset'
							? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
							: 'group-data-[collapsible=icon]:w-[--sidebar-width-icon]'
					)}
				/>
				<div
					className={cn(
						'fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex',
						side === 'left'
							? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
							: 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
						// Adjust the sidebar to inset the trigger and rail.
						variant === 'floating' || variant === 'inset'
							? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]'
							: 'group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l',
						className
					)}
					style={
						{
							'--sidebar-width': SIDEBAR_WIDTH,
							'--sidebar-width-icon': SIDEBAR_WIDTH_ICON
						} as React.CSSProperties
					}
					{...props}
				>
					<div
						data-sidebar="sidebar"
						className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow"
					>
						{children}
					</div>
				</div>
			</div>
		)
	}
)
Sidebar.displayName = 'Sidebar'

export { Sidebar }
