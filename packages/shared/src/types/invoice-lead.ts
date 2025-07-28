/**
 * Invoice lead magnet and validation types
 * Zod schemas and lead capture functionality for the invoice generator
 */

import { z } from 'zod'
import type { CustomerInvoice, CustomerInvoiceItem } from './invoices'
import { LEAD_MAGNET_CONFIG, INVOICE_DEFAULTS, INVOICE_NUMBER_PREFIX, type LeadMagnetTier } from '../constants/invoices'

// ========================
// Zod Validation Schemas
// ========================

/**
 * Invoice item validation schema
 */
export const InvoiceItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  total: z.number()
})

/**
 * Customer invoice validation schema for lead magnet
 */
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

// ========================
// Inferred Types from Schemas
// ========================

/**
 * Type exports - use Zod inference for runtime validation
 * but ensure they match the centralized types
 */
export type CustomerInvoiceForm = z.infer<typeof CustomerInvoiceSchema>
export type InvoiceItemForm = z.infer<typeof InvoiceItemSchema>

// ========================
// Type Compatibility Checks
// ========================

/**
 * Type assertions to ensure Zod schemas match centralized types
 * (These are compile-time checks only)
 */
export type CustomerInvoiceCheck =
  CustomerInvoiceForm extends Omit<
    CustomerInvoice,
    'id' | 'createdAt' | 'updatedAt' | 'userAgent' | 'ipAddress'
  >
    ? true
    : false

export type InvoiceItemCheck =
  InvoiceItemForm extends Omit<CustomerInvoiceItem, 'invoiceId' | 'createdAt'>
    ? true
    : false

// ========================
// Lead Capture Types
// ========================

/**
 * Email capture data for lead magnets
 */
export interface EmailCaptureData {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  source?: string
  invoiceId: string
}

/**
 * Invoice download response
 */
export interface InvoiceDownloadResponse {
  success: boolean
  downloadUrl?: string
  message?: string
}

/**
 * Invoice generation request
 */
export interface InvoiceGenerationRequest {
  invoice: Omit<CustomerInvoice, 'id' | 'createdAt' | 'updatedAt'>
  emailCapture?: EmailCaptureData
}

// ========================
// Default Templates
// ========================

/**
 * Default invoice template
 */
export const defaultCustomerInvoice: Partial<CustomerInvoiceForm> = {
  invoiceNumber: `${INVOICE_NUMBER_PREFIX}${Date.now()}`,
  issueDate: new Date(),
  dueDate: new Date(Date.now() + INVOICE_DEFAULTS.PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000),
  status: 'DRAFT',
  taxRate: INVOICE_DEFAULTS.TAX_RATE,
  items: [],
  notes: INVOICE_DEFAULTS.NOTES,
  terms: INVOICE_DEFAULTS.TERMS,
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  downloadCount: INVOICE_DEFAULTS.DOWNLOAD_COUNT,
  isProVersion: INVOICE_DEFAULTS.IS_PRO_VERSION
}

// Lead Magnet Configuration is imported from constants/invoices.ts
// Re-export the configuration and type for convenience
export { LEAD_MAGNET_CONFIG }
export type { LeadMagnetTier }

// ========================
// Validation Helpers
// ========================

/**
 * Validate invoice form data
 */
export function validateInvoiceForm(data: unknown): CustomerInvoiceForm {
  return CustomerInvoiceSchema.parse(data)
}

/**
 * Validate invoice item
 */
export function validateInvoiceItem(data: unknown): InvoiceItemForm {
  return InvoiceItemSchema.parse(data)
}

/**
 * Check if invoice is within tier limits
 */
export function checkTierLimits(
  invoiceCount: number,
  lineItemCount: number,
  tier: LeadMagnetTier
): {
  withinInvoiceLimit: boolean
  withinLineItemLimit: boolean
  canCreateInvoice: boolean
} {
  const config = LEAD_MAGNET_CONFIG[tier]
  
  const withinInvoiceLimit = config.maxInvoicesPerMonth === -1 || invoiceCount < config.maxInvoicesPerMonth
  const withinLineItemLimit = config.maxLineItems === -1 || lineItemCount <= config.maxLineItems
  
  return {
    withinInvoiceLimit,
    withinLineItemLimit,
    canCreateInvoice: withinInvoiceLimit && withinLineItemLimit
  }
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
  items: InvoiceItemForm[],
  taxRate: number = 0
): {
  subtotal: number
  taxAmount: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  }
}