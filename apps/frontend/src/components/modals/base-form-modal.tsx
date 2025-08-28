import type { ReactNode } from 'react'
import { motion } from '@/lib/lazy-motion'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { ButtonSpinner } from '@/components/ui/spinner'
import { modalVariants, fieldVariants } from './modal-constants'
import type { BaseFormModalProps as BaseFormModalPropsType } from '@repo/shared/types/ui'

// Extend the base type with additional properties
interface BaseFormModalProps extends BaseFormModalPropsType {
	icon?: string
	iconBgColor?: string
	iconColor?: string
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
	icon,
	iconBgColor = 'bg-blue-1',
	iconColor = 'text-primary',
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
		void onSubmit?.()
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
							{icon && (
								<div
									className={`flex h-10 w-10 items-center justify-center ${iconBgColor} rounded-lg`}
								>
									<i className={`${icon} h-5 w-5 ${iconColor}`} />
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
						{children as React.ReactNode}

						{!hideFooter && (
							<DialogFooter className="border-t border-gray-2 pt-6">
								<Button
									type="button"
									variant="outline"
									onClick={onClose}
									disabled={isSubmitting}
								>
									<i className="i-lucide-x mr-2 h-4 w-4"  />
									{cancelLabel}
								</Button>
								<Button
									type="submit"
									variant="default"
									disabled={isSubmitting || submitDisabled}
								>
									{isSubmitting ? (
										<ButtonSpinner text="Saving..." />
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
	icon,
	title,
	children,
	delay = 0
}: {
	icon: string
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
			<div className="flex items-center space-x-2 border-b border-gray-2 pb-2">
				<i className={`${icon} h-4 w-4 text-gray-6`} />
				<h3 className="font-medium text-gray-9">{title}</h3>
			</div>
			{children}
		</motion.div>
	)
}
