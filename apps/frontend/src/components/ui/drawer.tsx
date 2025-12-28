'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import { cn } from '#lib/utils'

function Drawer({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
	return <DrawerPrimitive.Root {...props} />
}

function DrawerTrigger({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger {...props} />
}

function DrawerPortal({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal {...props} />
}

function DrawerClose({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close {...props} />
}

function DrawerOverlay({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
	return (
		<DrawerPrimitive.Overlay
			data-tokens="applied"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'fixed inset-0 backdrop-blur-md',
				'bg-(--color-fill-quaternary) transition-all duration-(--duration-standard) ease-(--ease-smooth) z-(--z-modal-backdrop)',
				className
			)}
			{...props}
		/>
	)
}

function DrawerContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
	return (
		<DrawerPortal>
			<DrawerOverlay />
			<DrawerPrimitive.Content
				data-tokens="applied"
				className={cn(
					'group/drawer-content fixed flex h-auto flex-col',
					'bg-(--glass-material) border-(--glass-border) shadow-(--glass-shadow)',
					'backdrop-filter backdrop-blur-(--glass-blur)',
					'transition-all duration-(--duration-standard) ease-(--ease-smooth)',
					'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:border-b',
					'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:border-t',
					'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
					'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
					className
				)}
				style={{
					zIndex: 'var(--z-modal)',
					borderTopLeftRadius:
						'data-[vaul-drawer-direction=bottom]:var(--radius-lg)',
					borderTopRightRadius:
						'data-[vaul-drawer-direction=bottom]:var(--radius-lg)',
					borderBottomLeftRadius:
						'data-[vaul-drawer-direction=top]:var(--radius-lg)',
					borderBottomRightRadius:
						'data-[vaul-drawer-direction=top]:var(--radius-lg)'
				}}
				{...props}
			>
				<div className="mx-auto mt-(--spacing-4) hidden shrink-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:block h-2 w-24 bg-(--color-fill-primary) rounded-full" />
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	)
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-tokens="applied"
			className={cn(
				'flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
				className
			)}
			{...props}
		/>
	)
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-tokens="applied"
			className={cn('mt-auto flex flex-col gap-2 p-4', className)}
			{...props}
		/>
	)
}

function DrawerTitle({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			data-tokens="applied"
			className={cn(
				'text-(--font-title-2) leading-(--line-height-title-2) font-semibold tracking-(--tracking-title)',
				'text-(--color-label-primary)',
				className
			)}
			{...props}
		/>
	)
}

function DrawerDescription({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
	return (
		<DrawerPrimitive.Description
			data-tokens="applied"
			className={cn('text-(--color-label-tertiary) text-sm', className)}
			{...props}
		/>
	)
}

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger
}
