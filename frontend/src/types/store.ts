// Store-related types and interfaces
import type { CustomerInvoice, InvoiceItem, EmailCaptureData } from './invoice'
import type { User } from './auth'

export type LeadMagnetTier = 'FREE_TIER' | 'PRO_TIER'

export interface InvoiceState {
	// Current invoice being edited
	currentInvoice: Partial<CustomerInvoice> | null

	// Invoice list for authenticated users
	invoices: CustomerInvoice[]

	// UI state
	isGenerating: boolean
	isLoading: boolean
	showEmailCapture: boolean
	showPreview: boolean

	// Lead magnet state
	userTier: LeadMagnetTier
	monthlyUsage: number

	// Error handling
	error: string | null
}

export interface InvoiceActions {
	// Current invoice management
	setCurrentInvoice: (invoice: Partial<CustomerInvoice> | null) => void
	updateCurrentInvoice: (updates: Partial<CustomerInvoice>) => void
	clearCurrentInvoice: () => void

	// Item management
	addInvoiceItem: () => void
	updateInvoiceItem: (index: number, item: Partial<InvoiceItem>) => void
	removeInvoiceItem: (index: number) => void

	// Calculations
	recalculateInvoice: () => void

	// Invoice operations
	generateInvoice: (emailCapture?: EmailCaptureData) => Promise<string> // returns download URL
	saveInvoice: (invoice: CustomerInvoice) => Promise<void>
	loadInvoices: () => Promise<void>

	// UI state management
	setGenerating: (isGenerating: boolean) => void
	setLoading: (isLoading: boolean) => void
	setShowEmailCapture: (show: boolean) => void
	setShowPreview: (show: boolean) => void
	setError: (error: string | null) => void

	// Lead magnet
	checkUsageLimit: () => boolean
	upgradeToPro: () => Promise<void>

	// Reset store
	reset: () => void
}

export type InvoiceStore = InvoiceState & InvoiceActions

// Auth Store Types
export interface AuthStore {
	user: User | null
	isLoading: boolean
	error: string | null
	hasSessionExpired: boolean
	setUser: (user: User | null) => void
	setLoading: (isLoading: boolean) => void
	setError: (error: string | null) => void
	signIn: (email: string, password: string) => Promise<void>
	signUp: (email: string, password: string, name: string) => Promise<void>
	signOut: () => Promise<void>
	checkSession: () => Promise<void>
	updateProfile: (updates: Partial<User>) => Promise<void>
	getCurrentUser: () => Promise<User | null>
	resetSessionCheck: () => void
	resetCircuitBreaker: () => void
}

// Circuit breaker for profile lookup failures
export interface SessionCheckState {
	lastFailTime: number
	failureCount: number
	isCircuitOpen: boolean
}
