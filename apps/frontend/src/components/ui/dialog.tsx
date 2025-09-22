'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Dialog({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			data-tokens="applied" className={cn(
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

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				data-tokens="applied" className={cn(
					// Apple-inspired modal with glass material and premium shadows
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]',
					'fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-var(--spacing-8))]',
					'translate-x-[-50%] translate-y-[-50%] gap-[var(--spacing-4)] p-[var(--spacing-6)] sm:max-w-lg',
					'border-[var(--glass-border)] backdrop-filter backdrop-blur-[var(--glass-blur)]',
					'bg-[var(--glass-material)] shadow-[var(--glass-shadow)]',
					'transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]',
					className
				)}
				style={{
					zIndex: 'var(--z-modal)',
					borderRadius: 'var(--radius-xxlarge)'
				}}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						data-tokens="applied" className={cn(
							'absolute flex items-center justify-center',
							'min-h-[var(--spacing-9)] min-w-[var(--spacing-9)] p-[var(--spacing-2)]',
							'top-[var(--spacing-4)] right-[var(--spacing-4)]',
							'bg-[var(--color-fill-secondary)] text-[var(--color-label-secondary)]',
							'opacity-70 hover:opacity-100 hover:scale-110 active:scale-95',
							'focus:ring-[var(--focus-ring-width)] focus:ring-[var(--focus-ring-color)]/50 focus:outline-hidden',
							'disabled:pointer-events-none',
							"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
							'transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]'
						)}
						style={{
							borderRadius: 'var(--radius-medium)'
						}}
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	)
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="dialog-header"
			data-tokens="applied" className={cn('flex flex-col gap-[var(--spacing-2)] text-center sm:text-left', className)}
			{...props}
		/>
	)
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="dialog-footer"
			data-tokens="applied" className={cn(
				'flex flex-col-reverse gap-[var(--spacing-2)] sm:flex-row sm:justify-end',
				className
			)}
			{...props}
		/>
	)
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			data-tokens="applied" className={cn(
				'text-[var(--font-title-2)] leading-[var(--line-height-title-2)] font-semibold tracking-[var(--tracking-title)]',
				'text-[var(--color-label-primary)]',
				className
			)}
			{...props}
		/>
	)
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			data-tokens="applied" className={cn('text-[var(--color-label-tertiary)] text-sm', className)}
			{...props}
		/>
	)
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger
}
