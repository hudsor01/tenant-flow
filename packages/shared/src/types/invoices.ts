/**
 * Invoice management types
 * All types related to customer invoices, invoice items, and invoice generation
 */

// Remove frontend-specific dependencies - use generic form types instead
// Define CustomerInvoiceForm inline instead of importing
export interface CustomerInvoiceForm {
	businessName: string
	businessEmail: string
	clientName: string
	clientEmail: string
	invoiceNumber: string
	issueDate: string
	dueDate: string
	subtotal: number
	taxRate: number
	taxAmount: number
	total: number
	items: CustomerInvoiceItem[] // Added this line
}

// Use Supabase CustomerInvoiceStatus instead of custom duplicate
import type { Database } from './supabase-generated.js'
export type CustomerInvoiceStatus =
	Database['public']['Enums']['customer_invoice_status']

export const CUSTOMER_INVOICE_STATUS = {
	DRAFT: 'DRAFT',
	SENT: 'SENT',
	VIEWED: 'VIEWED',
	PAID: 'PAID',
	OVERDUE: 'OVERDUE',
	CANCELLED: 'CANCELLED'
} as const

export const CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(
	CUSTOMER_INVOICE_STATUS
)

// Invoice status display helpers
export const getCustomerInvoiceStatusLabel = (
	status: CustomerInvoiceStatus
): string => {
	const labels: Record<CustomerInvoiceStatus, string> = {
		DRAFT: 'Draft',
		SENT: 'Sent',
		VIEWED: 'Viewed',
		PAID: 'Paid',
		OVERDUE: 'Overdue',
		CANCELLED: 'Cancelled'
	}
	return labels[status] || status
}

export const getCustomerInvoiceStatusColor = (
	status: CustomerInvoiceStatus
): string => {
	const colors: Record<CustomerInvoiceStatus, string> = {
		DRAFT: 'bg-gray-100 text-gray-800',
		SENT: 'bg-blue-100 text-blue-800',
		VIEWED: 'bg-yellow-100 text-yellow-800',
		PAID: 'bg-green-100 text-green-800',
		OVERDUE: 'bg-red-100 text-red-800',
		CANCELLED: 'bg-gray-100 text-gray-800'
	}
	return colors[status] || 'bg-gray-100 text-gray-800'
}

// Use Supabase table types instead of duplicating
export type CustomerInvoice =
	Database['public']['Tables']['customer_invoice']['Row']
export type CustomerInvoiceItem =
	Database['public']['Tables']['customer_invoice_item']['Row']

// Invoice lead capture types
export interface InvoiceLeadCapture {
	id: string
	email: string
	invoiceId: string | null
	firstName: string | null
	lastName: string | null
	company: string | null
	source: string | null
	medium: string | null
	campaign: string | null
	emailSent: boolean
	emailOpened: boolean
	linkClicked: boolean
	converted: boolean
	createdAt: Date
	updatedAt: Date
}

// Generic form register function type - framework agnostic
export type GenericFormRegister<T> = (field: keyof T) => Record<string, unknown>

export type GenericFieldErrors<T> = {
	[K in keyof T]?: { message?: string }
}

export interface InvoiceDetailsProps {
	register: GenericFormRegister<CustomerInvoiceForm>
	errors?: GenericFieldErrors<CustomerInvoiceForm>
}

export interface InvoiceActionsProps {
	invoice: CustomerInvoice
	onDownload?: () => void
	onEmail?: () => void
	onEdit?: () => void
}

export interface BusinessInfoSectionProps {
	register: GenericFormRegister<CustomerInvoiceForm>
	errors?: GenericFieldErrors<CustomerInvoiceForm>
}

export interface ClientInfoSectionProps {
	register: GenericFormRegister<CustomerInvoiceForm>
	errors?: GenericFieldErrors<CustomerInvoiceForm>
}

export interface EmailModalProps {
	isOpen: boolean
	onClose: () => void
	invoice: CustomerInvoice
	onSend?: (email: string, subject: string, message: string) => void
}
