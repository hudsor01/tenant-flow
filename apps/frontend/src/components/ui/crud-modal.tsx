'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useModalStore } from '#stores/modal-store'
import { cn } from '#lib/utils'
import type { ReactNode } from 'react'

export type CrudMode = 'create' | 'read' | 'edit' | 'delete'

export interface CrudModalProps {
	/**
	 * CRUD operation mode
	 */
	mode: CrudMode
	/**
	 * Unique modal ID for the modal store
	 */
	modalId?: string
	/**
	 * Modal content children
	 */
	children: ReactNode
	/**
	 * Custom className for the modal container
	 */
	className?: string
	/**
	 * Whether to persist the modal through navigation
	 */
	persistThroughNavigation?: boolean
	/**
	 * Custom close handler
	 */
	onClose?: () => void
}

/**
 * CrudModal - Universal CRUD modal component for route-based operations
 *
 * Enhanced with TenantFlow design system:
 * - Custom shadows and borders from globals.css
 * - Proper typography using font-display
 * - Touch-friendly spacing and sizing
 * - Consistent color tokens
 * - Route-based navigation with back-button UX
 * - Modal store integration for state management
 * - React Spring animations
 */
export function CrudModal({
	mode: _mode,
	modalId,
	children,
	className,
	persistThroughNavigation = false,
	onClose
}: CrudModalProps) {
	const router = useRouter()
	const { isModalOpen, closeModal } = useModalStore()

	const isOpen = modalId ? isModalOpen(modalId) : false

	useEffect(() => {
		if (!persistThroughNavigation && !isOpen) {
			// Navigate back when modal closes (unless persisting through navigation)
			router.back()
		}
	}, [isOpen, router, persistThroughNavigation])

	const handleClose = () => {
		if (modalId) {
			closeModal(modalId)
		}
		onClose?.()
	}

	if (!isOpen) {
		return null
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop with TenantFlow transitions */}
			<div
				className="absolute inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
				onClick={handleClose}
			/>

			{/* Modal Content with TenantFlow styling */}
			<div
				className={cn(
					'relative z-10 w-full max-w-lg mx-4 bg-background border shadow-lg rounded-lg p-6',
					'border-border/50 shadow-medium',
					'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200',
					'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2',
					className
				)}
			>
				{children}
			</div>
		</div>
	)
}

// Additional modal components for composition with TenantFlow styling
export const CrudModalHeader = React.forwardRef<
	React.ElementRef<'div'>,
	React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('flex flex-col gap-3 text-center sm:text-left', className)}
		{...props}
	/>
))
CrudModalHeader.displayName = 'CrudModalHeader'

export const CrudModalTitle = React.forwardRef<
	React.ElementRef<'h2'>,
	React.ComponentPropsWithoutRef<'h2'>
>(({ className, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			'text-lg font-semibold leading-none tracking-tight text-foreground font-display',
			className
		)}
		{...props}
	/>
))
CrudModalTitle.displayName = 'CrudModalTitle'

export const CrudModalDescription = React.forwardRef<
	React.ElementRef<'p'>,
	React.ComponentPropsWithoutRef<'p'>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn('text-sm text-muted-foreground leading-relaxed', className)}
		{...props}
	/>
))
CrudModalDescription.displayName = 'CrudModalDescription'

export const CrudModalContent = React.forwardRef<
	React.ElementRef<'div'>,
	React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('space-y-4', className)} {...props} />
))
CrudModalContent.displayName = 'CrudModalContent'

export const CrudModalFooter = React.forwardRef<
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
CrudModalFooter.displayName = 'CrudModalFooter'

export const CrudModalClose = React.forwardRef<
	React.ElementRef<'button'>,
	React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
	<button
		ref={ref}
		className={cn(
			"ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
			className
		)}
		{...props}
	>
		<svg
			className="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M18 6L6 18M6 6l12 12" />
		</svg>
		<span className="sr-only">Close</span>
	</button>
))
CrudModalClose.displayName = 'CrudModalClose'
