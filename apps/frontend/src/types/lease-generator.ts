export interface LeaseGeneratorForm {
	// Property Information
	propertyAddress: string
	city: string
	state: string
	zipCode: string
	unitNumber?: string
	countyName?: string
	parkingSpaces?: number
	storageUnit?: string

	// Landlord Information
	landlordName: string
	landlordEmail: string
	landlordPhone?: string
	landlordAddress: string

	// Tenant Information
	tenantNames: { name: string }[]
	emergencyContact?: {
		name: string
		phone: string
		relationship: string
	}

	// Lease Terms
	rentAmount: number
	securityDeposit: number
	leaseStartDate: string
	leaseEndDate: string
	moveInDate?: string
	prorationAmount?: number

	// Payment Information
	paymentDueDate: number // Day of month (1-31)
	lateFeeAmount: number
	lateFeeDays: number // Days after due date
	paymentMethod: 'check' | 'online' | 'bank_transfer' | 'cash'
	paymentAddress?: string

	// Additional Terms
	petPolicy: 'allowed' | 'not_allowed' | 'with_deposit'
	petDeposit?: number
	petDetails?: {
		type: string
		breed: string
		weight: string
		registration: string
	}
	smokingPolicy: 'allowed' | 'not_allowed'
	maintenanceResponsibility: 'landlord' | 'tenant' | 'shared'
	utilitiesIncluded: string[]
	additionalTerms?: string
	keyDeposit?: number
	occupancyLimits?: {
		maxOccupants: number
		childrenUnder2: boolean
	}
}

export interface LeaseGeneratorUsage {
	id: string
	email: string
	ipAddress: string
	userAgent: string
	usageCount: number
	lastUsedAt: string
	paymentStatus: 'free_trial' | 'paid' | 'subscription'
	stripeCustomerId?: string
	createdAt: string
	updatedAt: string
}

export interface LeaseTemplate {
	id: string
	name: string
	state: string
	templateHtml: string
	isDefault: boolean
	createdAt: string
	updatedAt: string
}

export type LeaseOutputFormat = 'pdf' | 'docx' | 'both'

export interface LeaseGenerationResult {
	success: boolean
	pdfUrl?: string
	docxUrl?: string
	zipUrl?: string
	error?: string
	usageRemaining: number
	requiresPayment: boolean
}
