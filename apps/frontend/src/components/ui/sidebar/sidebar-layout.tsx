'use client'

import { PanelLeftIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Separator } from '#components/ui/separator'
import { cn } from '#lib/utils'
import { useSidebar } from './context'

export function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar()

	return (
		<Button
			data-sidebar="trigger"
			variant="ghost"
			size="icon"
			className={cn('size-7', className)}
			onClick={(event) => {
				onClick?.(event)
				toggleSidebar()
			}}
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	)
}

export function SidebarRail({
	className,
	...props
}: React.ComponentProps<'button'>) {
	const { toggleSidebar } = useSidebar()

	return (
		<button
			data-sidebar="rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			className={cn(
				'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear sm:flex',
				'hover:after:bg-sidebar-border after:absolute after:inset-y-0 after:left-1/2 after:w-0.5',
				'group-data-[side=left]:-right-4 group-data-[side=right]:left-0',
				className
			)}
			{...props}
		/>
	)
}

export function SidebarInset({
	className,
	...props
}: React.ComponentProps<'main'>) {
	return (
		<main
			className={cn(
				'bg-background relative flex w-full flex-1 flex-col',
				'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className
			)}
			{...props}
		/>
	)
}

export function SidebarInput({
	className,
	...props
}: React.ComponentProps<typeof Input>) {
	return (
		<Input
			data-sidebar="input"
			className={cn('bg-background h-11 w-full shadow-none', className)}
			{...props}
		/>
	)
}

export function SidebarHeader({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-sidebar="header"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}

export function SidebarFooter({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-sidebar="footer"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}

export function SidebarSeparator({
	className,
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-sidebar="separator"
			className={cn('bg-sidebar-border mx-2 w-auto', className)}
			{...props}
		/>
	)
}
