/**
 * Invoice management types
 * All types related to customer invoices, invoice items, and invoice generation
 */

import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import type { CustomerInvoiceForm } from './invoice-lead'

// Customer invoice status enum
export type CustomerInvoiceStatus = 
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'

export const CUSTOMER_INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
} as const

export const CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(CUSTOMER_INVOICE_STATUS)

// Invoice status display helpers
export const getCustomerInvoiceStatusLabel = (status: CustomerInvoiceStatus): string => {
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

export const getCustomerInvoiceStatusColor = (status: CustomerInvoiceStatus): string => {
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

// Customer invoice entity types
export interface CustomerInvoice {
  id: string
  invoiceNumber: string
  status: CustomerInvoiceStatus
  businessName: string
  businessEmail: string
  businessAddress: string | null
  businessCity: string | null
  businessState: string | null
  businessZip: string | null
  businessPhone: string | null
  businessLogo: string | null
  clientName: string
  clientEmail: string
  clientAddress: string | null
  clientCity: string | null
  clientState: string | null
  clientZip: string | null
  issueDate: Date
  dueDate: Date
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string | null
  terms: string | null
  emailCaptured: string | null
  downloadCount: number
  isProVersion: boolean
  userAgent: string | null
  ipAddress: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CustomerInvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: Date
}

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

export interface InvoiceDetailsProps {
	register: UseFormRegister<CustomerInvoiceForm>
	errors?: FieldErrors<CustomerInvoiceForm>
}

export interface InvoiceActionsProps {
	invoice: CustomerInvoice
	onDownload?: () => void
	onEmail?: () => void
	onEdit?: () => void
}

export interface BusinessInfoSectionProps {
	register: UseFormRegister<CustomerInvoiceForm>
	errors?: FieldErrors<CustomerInvoiceForm>
}

export interface ClientInfoSectionProps {
	register: UseFormRegister<CustomerInvoiceForm>
	errors?: FieldErrors<CustomerInvoiceForm>
}

export interface EmailModalProps {
	isOpen: boolean
	onClose: () => void
	invoice: CustomerInvoice
	onSend?: (email: string, subject: string, message: string) => void
}
