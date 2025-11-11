'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '#lib/utils'
import { useModalStore } from '#stores/modal-store'
import type { ReactNode } from 'react'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'

export interface CrudDialogProps
	extends Omit<React.ComponentProps<typeof DialogPrimitive.Root>, 'children'> {
	/**
	 * CRUD operation mode
	 */
	mode: CrudMode
	/**
	 * Unique modal ID for the modal store (required for read/edit/delete modes)
	 */
	modalId?: string
	/**
	 * Dialog content children
	 */
	children: ReactNode
	/**
	 * Custom close handler
	 */
	onClose?: () => void
}

const CrudDialogPortal = DialogPrimitive.Portal

const CrudDialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
			className
		)}
		{...props}
	/>
))
CrudDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const CrudDialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
		showCloseButton?: boolean
	}
>(({ className, children, showCloseButton = true, ...props }, ref) => (
	<CrudDialogPortal>
		<CrudDialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-6 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
				'border-border/50 shadow-medium',
				className
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
					<XIcon />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			)}
		</DialogPrimitive.Content>
	</CrudDialogPortal>
))
CrudDialogContent.displayName = DialogPrimitive.Content.displayName

const CrudDialogHeader = React.forwardRef<
	React.ElementRef<'div'>,
	React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex flex-col gap-3 text-center sm:text-left', className)}
		{...props}
	/>
))
CrudDialogHeader.displayName = 'CrudDialogHeader'

const CrudDialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			'text-lg font-semibold leading-none tracking-tight text-foreground font-display',
			className
		)}
		{...props}
	/>
))
CrudDialogTitle.displayName = DialogPrimitive.Title.displayName

const CrudDialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn('text-sm text-muted-foreground leading-relaxed', className)}
		{...props}
	/>
))
CrudDialogDescription.displayName = DialogPrimitive.Description.displayName

const CrudDialogBody = React.forwardRef<
	React.ElementRef<'div'>,
	React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('space-y-4', className)} {...props} />
))
CrudDialogBody.displayName = 'CrudDialogBody'

const CrudDialogFooter = React.forwardRef<
	React.ElementRef<'div'>,
	React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			'flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2',
			className
		)}
		{...props}
	/>
))
CrudDialogFooter.displayName = 'CrudDialogFooter'

const CrudDialogClose = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Close>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Close
		ref={ref}
		className={cn(
			"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
			className
		)}
		{...props}
	>
		<XIcon />
		<span className="sr-only">Close</span>
	</DialogPrimitive.Close>
))
CrudDialogClose.displayName = DialogPrimitive.Close.displayName

/**
 * CrudDialog - Universal CRUD dialog component based on shadcn/ui Dialog
 *
 * Enhanced with TenantFlow design system:
 * - Custom shadows and borders from globals.css
 * - Proper typography using font-display
 * - Touch-friendly spacing and sizing
 * - Consistent color tokens
 * - Modal store integration for state management
 * - React Spring animations
 * - Enhanced accessibility and keyboard navigation
 */
function CrudDialog({
	mode,
	modalId,
	children,
	onClose,
	...props
}: CrudDialogProps) {
	const { isModalOpen, closeModal } = useModalStore()

	// For read/edit/delete modes, use modal store to control open state
	if (mode !== 'create' && modalId) {
		const isOpen = isModalOpen(modalId)
		return (
			<DialogPrimitive.Root
				open={isOpen}
				onOpenChange={open => {
					if (!open) {
						closeModal(modalId)
						onClose?.()
					}
				}}
				{...props}
			>
				{children}
			</DialogPrimitive.Root>
		)
	}

	// For create mode, use normal dialog behavior
	return (
		<DialogPrimitive.Root
			onOpenChange={open => {
				if (!open) {
					onClose?.()
				}
			}}
			{...props}
		>
			{children}
		</DialogPrimitive.Root>
	)
}
CrudDialog.displayName = DialogPrimitive.Root.displayName

export {
	CrudDialog,
	CrudDialogContent,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogDescription,
	CrudDialogBody,
	CrudDialogFooter,
	CrudDialogClose,
	CrudDialogPortal,
	CrudDialogOverlay,
	//
	CrudDialog as Dialog,
	CrudDialogContent as DialogContent,
	CrudDialogHeader as DialogHeader,
	CrudDialogTitle as DialogTitle,
	CrudDialogDescription as DialogDescription,
	CrudDialogBody as DialogBody,
	CrudDialogFooter as DialogFooter,
	CrudDialogClose as DialogClose
}
