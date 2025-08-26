/**
 * Invoice component type definitions
 * Types for invoice-related components and forms
 */

import type { FieldErrors, UseFormRegister } from 'react-hook-form'

// Invoice form data interface
export interface InvoiceFormData {
	businessName: string
	businessAddress: string
	businessPhone?: string
	businessCity?: string
	businessState?: string
	businessZip?: string
	businessEmail: string
	clientName: string
	clientAddress: string
	clientEmail: string
	invoiceNumber: string
	invoiceDate: string
	dueDate: string
	notes?: string
	terms?: string
	items: InvoiceItem[]
}

// Business Info Section Props
export interface BusinessInfoSectionProps {
	register: UseFormRegister<InvoiceFormData>
	errors: FieldErrors<InvoiceFormData>
}

// Client Info Section Props
export interface ClientInfoSectionProps {
	register: UseFormRegister<InvoiceFormData>
	errors: FieldErrors<InvoiceFormData>
}

// Invoice Actions Props
export interface InvoiceActionsProps {
	onGenerateInvoice?: () => void
	onPreview?: () => void
	onPrepareEmail?: () => void
	onSave?: () => void
	onSend?: () => void
	isLoading?: boolean
	disabled?: boolean
}

// Invoice Details Props
export interface InvoiceDetailsProps {
	register: UseFormRegister<InvoiceFormData>
	errors: FieldErrors<InvoiceFormData>
	items: InvoiceItem[]
	onItemAdd: () => void
	onItemRemove: (index: number) => void
	onItemChange: (
		index: number,
		field: keyof InvoiceItem,
		value: string | number
	) => void
}

// Invoice Item
export interface InvoiceItem {
	description: string
	quantity: number
	rate: number
	amount: number
}
