// Invoice-related component prop interfaces
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { CustomerInvoice } from './invoice'

export interface InvoiceDetailsProps {
	register: UseFormRegister<Record<string, unknown>>
	errors?: FieldErrors<Record<string, unknown>>
}

export interface InvoiceActionsProps {
	invoice: CustomerInvoice
	onDownload?: () => void
	onEmail?: () => void
	onEdit?: () => void
}

export interface BusinessInfoSectionProps {
	register: UseFormRegister<Record<string, unknown>>
	errors?: FieldErrors<Record<string, unknown>>
}

export interface ClientInfoSectionProps {
	register: UseFormRegister<Record<string, unknown>>
	errors?: FieldErrors<Record<string, unknown>>
}

export interface EmailModalProps {
	isOpen: boolean
	onClose: () => void
	invoice: CustomerInvoice
	onSend?: (email: string, subject: string, message: string) => void
}
