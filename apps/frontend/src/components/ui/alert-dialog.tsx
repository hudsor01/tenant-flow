'use client'

import { buttonVariants } from '@/components/ui/button'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'

import { cn } from '@/lib/utils'

function AlertDialog({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return (
		<AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
	)
}

function AlertDialogPortal({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	return (
		<AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
	)
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			data-tokens="applied"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'fixed inset-0 backdrop-blur-md',
				'bg-[var(--color-fill-quaternary)] transition-all duration-[var(--duration-standard)] ease-[var(--ease-smooth)]',
				className
			)}
			style={{
				zIndex: 'var(--z-modal-backdrop)'
			}}
			{...props}
		/>
	)
}

function AlertDialogContent({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				data-tokens="applied"
				className={cn(
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-var(--spacing-8))]',
					'translate-x-[-50%] translate-y-[-50%] gap-[var(--spacing-4)] p-[var(--spacing-6)] sm:max-w-lg',
					'border-[var(--glass-border)] backdrop-filter backdrop-blur-[var(--glass-blur)]',
					'bg-[var(--glass-material)] shadow-[var(--glass-shadow)]',
					'transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]',
					className
				)}
				style={{
					zIndex: 'var(--z-modal)',
					borderRadius: 'var(--radius-large)'
				}}
				{...props}
			/>
		</AlertDialogPortal>
	)
}

function AlertDialogHeader({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-header"
			data-tokens="applied"
			className={cn(
				'flex flex-col gap-[var(--spacing-2)] text-center sm:text-left',
				className
			)}
			{...props}
		/>
	)
}

function AlertDialogFooter({
	className,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-footer"
			data-tokens="applied"
			className={cn(
				'flex flex-col-reverse gap-[var(--spacing-2)] sm:flex-row sm:justify-end',
				className
			)}
			{...props}
		/>
	)
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			data-tokens="applied"
			className={cn(
				'text-[var(--font-title-2)] leading-[var(--line-height-title-2)] font-semibold tracking-[var(--tracking-title)]',
				'text-[var(--color-label-primary)]',
				className
			)}
			{...props}
		/>
	)
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			data-tokens="applied"
			className={cn('text-[var(--color-label-tertiary)] text-sm', className)}
			{...props}
		/>
	)
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return (
		<AlertDialogPrimitive.Action
			data-tokens="applied"
			className={cn(
				buttonVariants(),
				'transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]',
				className
			)}
			{...props}
		/>
	)
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel
			data-tokens="applied"
			className={cn(
				buttonVariants({ variant: 'outline' }),
				'transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]',
				className
			)}
			{...props}
		/>
	)
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger
}
