import type { ReactNode } from 'react'
import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { modalVariants, fieldVariants } from './modal-constants'

interface BaseFormModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	description?: string
	icon?: LucideIcon
	iconBgColor?: string
	iconColor?: string
	children: ReactNode
	submitLabel?: string
	cancelLabel?: string
	onSubmit?: () => void
	isSubmitting?: boolean
	submitDisabled?: boolean
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
	hideFooter?: boolean
}

const maxWidthClasses = {
	sm: 'max-w-sm',
	md: 'max-w-md',
	lg: 'max-w-lg',
	xl: 'max-w-xl',
	'2xl': 'max-w-2xl'
}

export function BaseFormModal({
	isOpen,
	onClose,
	title,
	description,
	icon: Icon,
	iconBgColor = 'bg-blue-100',
	iconColor = 'text-blue-600',
	children,
	submitLabel = 'Save',
	cancelLabel = 'Cancel',
	onSubmit,
	isSubmitting = false,
	submitDisabled = false,
	maxWidth = 'lg',
	hideFooter = false
}: BaseFormModalProps) {
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		onSubmit?.()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className={`${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto`}
			>
				<motion.div
					variants={modalVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
				>
					<DialogHeader className="pb-4">
						<div className="flex items-center space-x-2">
							{Icon && (
								<div
									className={`flex h-10 w-10 items-center justify-center ${iconBgColor} rounded-lg`}
								>
									<Icon className={`h-5 w-5 ${iconColor}`} />
								</div>
							)}
							<div className="flex-1">
								<DialogTitle className="text-xl font-bold">
									{title}
								</DialogTitle>
								{description && (
									<DialogDescription>
										{description}
									</DialogDescription>
								)}
							</div>
						</div>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-6">
						{children}

						{!hideFooter && (
							<DialogFooter className="border-t border-gray-200 pt-6">
								<Button
									type="button"
									variant="outline"
									onClick={onClose}
									disabled={isSubmitting}
								>
									<X className="mr-2 h-4 w-4" />
									{cancelLabel}
								</Button>
								<Button
									type="submit"
									variant="premium"
									disabled={isSubmitting || submitDisabled}
								>
									{isSubmitting ? (
										<div className="flex items-center">
											<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
											Saving...
										</div>
									) : (
										submitLabel
									)}
								</Button>
							</DialogFooter>
						)}
					</form>
				</motion.div>
			</DialogContent>
		</Dialog>
	)
}

// Helper component for form sections with consistent styling
export function FormSection({
	icon: Icon,
	title,
	children,
	delay = 0
}: {
	icon: LucideIcon
	title: string
	children: ReactNode
	delay?: number
}) {
	return (
		<motion.div
			variants={fieldVariants}
			initial="hidden"
			animate="visible"
			custom={delay}
			className="space-y-4"
		>
			<div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
				<Icon className="h-4 w-4 text-gray-600" />
				<h3 className="font-medium text-gray-900">{title}</h3>
			</div>
			{children}
		</motion.div>
	)
}
