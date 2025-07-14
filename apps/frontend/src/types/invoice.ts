import { z } from 'zod'

// Enhanced Invoice Types for Lead Magnet Feature
export const InvoiceItemSchema = z.object({
	id: z.string(),
	description: z.string().min(1, 'Description is required'),
	quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
	unitPrice: z.number().min(0, 'Unit price must be positive'),
	total: z.number()
})

export const CustomerInvoiceSchema = z.object({
	// Invoice Details
	invoiceNumber: z.string().min(1, 'Invoice number is required'),
	issueDate: z.date(),
	dueDate: z.date(),
	status: z
		.enum(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'])
		.default('DRAFT'),

	// Business Information (From)
	businessName: z.string().min(1, 'Business name is required'),
	businessEmail: z.string().email('Valid business email is required'),
	businessAddress: z.string().optional(),
	businessCity: z.string().optional(),
	businessState: z.string().optional(),
	businessZip: z.string().optional(),
	businessPhone: z.string().optional(),
	businessLogo: z.string().optional(),

	// Client Information (To)
	clientName: z.string().min(1, 'Client name is required'),
	clientEmail: z.string().email('Valid client email is required'),
	clientAddress: z.string().optional(),
	clientCity: z.string().optional(),
	clientState: z.string().optional(),
	clientZip: z.string().optional(),

	// Line Items
	items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),

	// Additional Information
	notes: z.string().optional(),
	terms: z.string().optional(),

	// Financial Calculations
	subtotal: z.number().default(0),
	taxRate: z.number().min(0).max(100).default(0),
	taxAmount: z.number().default(0),
	total: z.number().default(0),

	// Lead Magnet Features
	emailCaptured: z.string().email().optional(),
	downloadCount: z.number().default(0),
	isProVersion: z.boolean().default(false)
})

// Legacy support - maintain existing interface for backward compatibility
export const InvoiceSchema = z.object({
	// Invoice Details
	invoiceNumber: z.string().min(1, 'Invoice number is required'),
	issueDate: z.date(),
	dueDate: z.date(),

	// From (Your Business) - legacy field names
	fromName: z.string().min(1, 'Business name is required'),
	fromEmail: z.string().email('Valid email is required'),
	fromAddress: z.string().min(1, 'Address is required'),
	fromCity: z.string().min(1, 'City is required'),
	fromState: z.string().min(1, 'State is required'),
	fromZip: z.string().min(1, 'ZIP code is required'),
	fromPhone: z.string().optional(),

	// To (Client) - legacy field names
	toName: z.string().min(1, 'Client name is required'),
	toEmail: z.string().email('Valid email is required'),
	toAddress: z.string().min(1, 'Address is required'),
	toCity: z.string().min(1, 'City is required'),
	toState: z.string().min(1, 'State is required'),
	toZip: z.string().min(1, 'ZIP code is required'),

	// Items
	items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),

	// Additional Info
	notes: z.string().optional(),
	terms: z.string().optional(),

	// Calculations
	subtotal: z.number(),
	taxRate: z.number().min(0).max(100),
	taxAmount: z.number(),
	total: z.number()
})

// Type exports
export type CustomerInvoice = z.infer<typeof CustomerInvoiceSchema>
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>
export type Invoice = z.infer<typeof InvoiceSchema> // Legacy support

// Lead capture types
export interface EmailCaptureData {
	email: string
	firstName?: string
	lastName?: string
	company?: string
	source?: string
	invoiceId: string
}

export interface InvoiceDownloadResponse {
	success: boolean
	downloadUrl?: string
	message?: string
}

export interface InvoiceGenerationRequest {
	invoice: Omit<CustomerInvoice, 'id' | 'createdAt' | 'updatedAt'>
	emailCapture?: EmailCaptureData
}

// Default invoice template
export const defaultCustomerInvoice: Partial<CustomerInvoice> = {
	invoiceNumber: `INV-${Date.now()}`,
	issueDate: new Date(),
	dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
	status: 'DRAFT',
	taxRate: 0,
	items: [],
	notes: 'Thank you for your business!',
	terms: 'Payment is due within 30 days.',
	subtotal: 0,
	taxAmount: 0,
	total: 0,
	downloadCount: 0,
	isProVersion: false
}

// Legacy support
export const defaultInvoice: Partial<Invoice> = {
	invoiceNumber: `INV-${Date.now()}`,
	issueDate: new Date(),
	dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
	taxRate: 0,
	items: [],
	notes: 'Thank you for your business!',
	terms: 'Payment is due within 30 days.'
}

// Lead magnet configuration
export const LEAD_MAGNET_CONFIG = {
	FREE_TIER: {
		maxInvoicesPerMonth: 5,
		watermarkRequired: true,
		customBrandingAllowed: false,
		emailRequired: true,
		maxLineItems: 10
	},
	PRO_TIER: {
		maxInvoicesPerMonth: -1, // unlimited
		watermarkRequired: false,
		customBrandingAllowed: true,
		emailRequired: false,
		maxLineItems: -1, // unlimited
		price: 9.99
	}
} as const

export type LeadMagnetTier = keyof typeof LEAD_MAGNET_CONFIG
