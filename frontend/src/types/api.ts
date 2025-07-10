// Removed ReactNode and Key imports - these should not be in API response types
import type {
	Property,
	Tenant,
	Unit,
	Lease,
	Payment,
	User,
	MaintenanceRequest,
	Notification,
	PropertyType,
	UnitStatus,
	LeaseStatus,
	PaymentType,
	PaymentStatus
} from './entities'

// Base API response types
export interface ApiResponse<T = unknown> {
	data?: T
	error?: string
	message?: string
	statusCode?: number
}

export interface ApiError {
	message: string
	statusCode: number
	error?: string
}

// Authentication types
export interface AuthCredentials {
	email: string
	password: string
}

export interface RegisterData extends AuthCredentials {
	name: string
	confirmPassword: string
}

export interface AuthResponse {
	access_token: string
	refresh_token?: string
	user: {
		id: string
		email: string
		name?: string
	}
}

export interface RefreshTokenRequest {
	refresh_token: string
}

// User API types
export type UserProfileResponse = User

export interface UpdateUserProfileDto {
	name?: string | null
	phone?: string | null
	bio?: string | null
	avatarUrl?: string | null
}

// Property API types
export interface CreatePropertyDto {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	description?: string
	propertyType?: PropertyType
	imageUrl?: string
	hasGarage?: boolean
	hasPool?: boolean
	numberOfUnits?: number
	createUnitsNow?: boolean
}

export interface UpdatePropertyDto {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	description?: string
	propertyType?: PropertyType
	imageUrl?: string
	hasGarage?: boolean
	hasPool?: boolean
	numberOfUnits?: number
}

export interface PropertyStats {
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	totalRentAmount: number
	collectionsRate: number
}

// Tenant API types
export interface CreateTenantDto {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
}

export interface UpdateTenantDto {
	name?: string
	email?: string
	phone?: string
	emergencyContact?: string
}

export interface TenantStats {
	totalTenants: number
	activeTenants: number
	inactiveTenants: number
	pendingInvitations: number
}

// Unit API types
export interface CreateUnitDto {
	unitNumber: string
	propertyId: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rent: number
	status?: UnitStatus
}

export interface UpdateUnitDto {
	unitNumber?: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rent?: number
	status?: UnitStatus
	lastInspectionDate?: string
}

export interface UnitStats {
	totalUnits: number
	availableUnits: number
	occupiedUnits: number
	maintenanceUnits: number
	averageRent: number
}

// Lease API types
export interface CreateLeaseDto {
	unitId: string
	tenantId: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	status?: LeaseStatus
}

export interface UpdateLeaseDto {
	startDate?: string
	endDate?: string
	rentAmount?: number
	securityDeposit?: number
	status?: LeaseStatus
}

export interface LeaseStats {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	pendingLeases: number
	totalRentRoll: number
}

export interface ExpiringLease extends Lease {
	rentAmount: number
	endDate: string
	unit: Unit & {
		property: Property
	}
	tenant: Tenant
	daysUntilExpiry: number
}

// Payment API types
export interface CreatePaymentDto {
	leaseId: string
	amount: number
	date: string
	type: PaymentType
	status?: PaymentStatus
	notes?: string
}

export interface UpdatePaymentDto {
	amount?: number
	date?: string
	type?: PaymentType
	status?: PaymentStatus
	notes?: string
}

export interface PaymentAnalyticsData {
	totalPayments: number
	totalAmount: number
	pendingAmount: number
	overdueAmount: number
	collectionRate: number
	currentMonthAmount: number
	currentMonthPayments: number
	lastMonthAmount: number
	lastMonthPayments: number
	currentYearAmount: number
	currentYearPayments: number
	averagePaymentAmount: number
	paymentTypes: Record<string, number>
	monthlyData: Record<
		string,
		{
			month: string
			amount: number
			count: number
		}
	>
	topPayingTenants: {
		tenantId: string
		tenantName: string
		totalAmount: number
		paymentCount: number
	}[]
}

// Maintenance API types
export interface CreateMaintenanceDto {
	unitId: string
	title: string
	description: string
	priority?: string
	status?: string
}

export interface UpdateMaintenanceDto {
	title?: string
	description?: string
	priority?: string
	status?: string
	assignedTo?: string
	estimatedCost?: number
	actualCost?: number
	completedAt?: string
}

// Notification API types
export interface CreateNotificationDto {
	title: string
	message: string
	type: string
	priority: string
	userId: string
	propertyId?: string
	tenantId?: string
	leaseId?: string
	paymentId?: string
	maintenanceId?: string
	actionUrl?: string
	data?: Record<string, unknown>
}

export interface UpdateNotificationDto {
	read?: boolean
}

// File upload types
export interface FileUploadResponse {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
}

// Query parameters for API calls
export interface PropertyQuery {
	page?: number
	limit?: number
	search?: string
	propertyType?: PropertyType
}

export interface TenantQuery {
	page?: number
	limit?: number
	search?: string
	status?: string
}

export interface UnitQuery {
	page?: number
	limit?: number
	propertyId?: string
	status?: UnitStatus
}

export interface LeaseQuery {
	page?: number
	limit?: number
	status?: LeaseStatus
	expiring?: boolean
	days?: number
}

export interface PaymentQuery {
	page?: number
	limit?: number
	leaseId?: string
	status?: PaymentStatus
	startDate?: string
	endDate?: string
}

export interface MaintenanceQuery {
	page?: number
	limit?: number
	unitId?: string
	status?: string
	priority?: string
}

export interface NotificationQuery {
	page?: number
	limit?: number
	read?: boolean
	type?: string
}

// Extended entity types with relationships for API responses
export interface PropertyWithDetails extends Property {
	units?: Unit[]
	_count?: {
		units: number
		leases: number
	}
}

export interface TenantWithDetails extends Tenant {
	invitationStatus: string
	leases?: LeaseWithDetails[]
	_count?: {
		leases: number
		payments: number
	}
}

export interface UnitWithDetails extends Omit<Unit, 'lease' | 'leases'> {
	property?: Property
	lease?: LeaseWithDetails
	leases?: LeaseWithDetails[]
	maintenanceRequests?: MaintenanceRequest[]
	_count?: {
		leases: number
		maintenanceRequests: number
	}
}

export interface LeaseWithDetails extends Lease {
	unit?: Unit & {
		property: Property
	}
	tenant?: Tenant
	payments?: Payment[]
	_count?: {
		payments: number
	}
}

export interface PaymentWithDetails extends Payment {
	lease?: Lease & {
		unit: Unit & {
			property: Property
		}
		tenant: Tenant
	}
}

export interface MaintenanceWithDetails extends MaintenanceRequest {
	unit?: Unit & {
		property: Property
	}
}

export interface NotificationWithDetails extends Notification {
	property?: Property
	tenant?: Tenant
	lease?: Lease
	payment?: Payment
	maintenanceRequest?: MaintenanceRequest
}

// Dashboard statistics
export interface DashboardStats {
	properties: PropertyStats
	tenants: TenantStats
	units: UnitStats
	leases: LeaseStats
	payments: PaymentAnalyticsData
	maintenanceRequests: {
		total: number
		open: number
		inProgress: number
		completed: number
	}
	notifications: {
		total: number
		unread: number
	}
}

// Invitation types
export interface InviteTenantDto {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
	propertyId: string
	unitId: string
}

export interface InviteTenantData {
	name: string
	email: string
	phone?: string
	propertyId: string
	unitId?: string // Optional unit selection
}

export interface InvitationResponse {
	success: boolean
	message: string
	invitation?: {
		id: string
		token: string
		expiresAt: string
	}
}
