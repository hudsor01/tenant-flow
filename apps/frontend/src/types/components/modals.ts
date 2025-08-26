/**
 * Modal component type definitions
 * Centralizes all modal-related component interfaces
 */

import type { ReactNode } from 'react'

// Base modal props
export interface BaseModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	description?: string
}

// Upgrade prompt modal
export interface UpgradePromptModalProps extends BaseModalProps {
	action: string
	reason: string
	currentPlan: string
	suggestedPlan?: string
}

// Base form modal
export interface BaseFormModalProps extends BaseModalProps {
	children: ReactNode
	onSubmit?: () => void | Promise<void>
	submitLabel?: string
	cancelLabel?: string
	isLoading?: boolean
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

// Email modal
export interface EmailModalProps extends BaseModalProps {
	recipientEmail?: string
	subject?: string
	body?: string
	attachments?: File[]
	onSend: (data: EmailData) => void | Promise<void>
}

export interface EmailData {
	to: string
	subject: string
	body: string
	attachments?: File[]
}

// Confirmation modal
export interface ConfirmationModalProps extends BaseModalProps {
	message: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void | Promise<void>
	variant?: 'default' | 'danger' | 'warning'
}

// Form modal
export interface FormModalProps<T = unknown> extends BaseModalProps {
	formData?: T
	onSubmit: (data: T) => void | Promise<void>
	fields: FormField[]
	validationRules?: Record<string, unknown>
}

export interface FormField {
	name: string
	label: string
<<<<<<< HEAD
	type:
		| 'text'
		| 'email'
		| 'password'
		| 'number'
		| 'textarea'
		| 'select'
		| 'checkbox'
=======
	type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox'
>>>>>>> origin/main
	placeholder?: string
	required?: boolean
	options?: { value: string; label: string }[]
	defaultValue?: string | number | boolean
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
