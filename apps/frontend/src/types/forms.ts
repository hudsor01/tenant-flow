/**
 * Common form type definitions
 * Centralizes all form-related types to eliminate duplication
 */

// Base form types
export interface FormState {
	isSubmitting: boolean
	isValid: boolean
	isDirty: boolean
}

export type FormErrors = Record<string, string[] | undefined>;

export type FormTouched = Record<string, boolean>;

// Auth form types
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

// Profile form types
export interface ProfileFormData {
	name: string
	email: string
	phone?: string
	company?: string
	address?: string
	avatar?: string
}

// Property form types
export interface PropertyFormData {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	type: 'SINGLE_FAMILY' | 'MULTI_FAMILY' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL'
	units?: number
	rentAmount?: number
	description?: string
	amenities?: string[]
	images?: string[]
}

// Tenant form types
export interface TenantFormData {
	firstName: string
	lastName: string
	email: string
	phone: string
	emergencyContact?: {
		name: string
		phone: string
		relationship: string
	}
}

// Lease form types
export interface LeaseFormData {
	propertyId: string
	tenantId: string
	unitId?: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	paymentDue: number
	terms?: string
}

// Maintenance form types  
export interface MaintenanceFormData {
	propertyId: string
	unitId?: string
	tenantId?: string
	title: string
	description: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	category: string
	images?: string[]
}

// Contact form types
export interface ContactFormData {
	name: string
	email: string
	subject: string
	message: string
	phone?: string
}

// Form field props
export interface FormFieldProps {
	name: string
	label?: string
	placeholder?: string
	type?: string
	required?: boolean
	disabled?: boolean
	error?: string | string[]
	touched?: boolean
	value?: unknown
	onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
	onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}