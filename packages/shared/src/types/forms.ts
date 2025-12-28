/**
 * Form Data and State Types
 * Consolidated source for all form-related interfaces and types
 */

import type { Database } from './supabase.js'

// Base form state interface
/**
 * Minimal shape used by field render-props across the frontend.
 * Keep this intentionally small to avoid coupling to internal library types
 * while still providing a canonical, reusable type to replace ad-hoc casts.
 */
export type FormFieldApi<TValue = unknown> = {
	state: {
		value: TValue
		meta: {
			errors?: unknown[]
		}
	}
	handleChange: (value: TValue | ((prev: TValue) => TValue)) => void
	handleBlur: () => void
}

export interface FormState<T> {
	values: T
	errors: Record<string, string>
	isDirty: boolean
	isSubmitting: boolean
	touched: Record<string, boolean>
}

// Authentication forms
export interface LoginFormData {
	email: string
	password: string
	rememberMe?: boolean
}

export interface SignupFormData {
	email: string
	password: string
	confirmPassword: string
	fullName: string
	firstName?: string
	lastName?: string
	company?: string
	companyName?: string
	acceptTerms: boolean
}

export interface ForgotPasswordFormData {
	email: string
}

export interface ResetPasswordFormData {
	password: string
	confirmPassword: string
}

export interface UpdatePasswordFormData {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export interface ProfileFormData {
	name: string
	email: string
	phone?: string
	company?: string
	address?: string
	avatar?: string
}

export interface ContactFormData {
	name: string
	email: string
	subject: string
	message: string
	phone?: string
}

// Property form
export interface PropertyFormData {
	id?: string
	name: string
	address: string
	city: string
	state: string
	postal_code: string
	property_type: string
	description?: string
	imageUrl?: string

	// Form-specific computed fields
	totalUnits?: number
	rent_amount?: number
	square_feet?: number
	bedrooms?: number
	bathrooms?: number
	yearBuilt?: number
	manager?: string
	amenities?: string[]
	petsAllowed?: boolean
	parkingSpaces?: number
}

// Lease form
export interface LeaseFormData {
	// Property Information
	property: {
		address: {
			street: string
			unit?: string
			city: string
			state: string
			postal_code: string
		}
		type: string
		bedrooms: number
		bathrooms: number
		square_feet?: number
		parking?: {
			included: boolean
			spaces?: number
			monthly_fee?: number
		}
		amenities?: string[]
	}

	// owner Information
	owner: {
		name: string
		isEntity: boolean // Individual vs LLC/Corp
	}

	// Lease Terms
	lease: {
		startDate: string
		endDate: string
		rentAmount: number
		securityDeposit: number
		lateFeeAmount?: number
		lateFeePercentage?: number
		gracePeriodDays?: number
	}

	// Tenant Information
	tenant: {
		name: string
		email: string
		phone: string
		ssn?: string
		dob?: string
	}

	// Additional terms
	terms?: {
		petPolicy?: string
		utilitiesIncluded?: string[]
		maintenanceResponsibility?: 'landlord' | 'tenant' | 'shared'
	}
}

// Hook form props
export interface UseLeaseFormProps {
	lease?: Database['public']['Tables']['leases']['Row']
	mode?: 'create' | 'edit'
	property_id?: string
	unit_id?: string
	tenant_id?: string
	onSuccess: () => void
	onClose: () => void
}

export interface UsePropertyFormDataProps {
	property?: Database['public']['Tables']['properties']['Row']
	mode: 'create' | 'edit'
	isOpen: boolean
}

// Form submission
export interface FileUploadRequest {
	file: string // base64 encoded file
	filename: string
	contentType: string
	folder?: string
}
