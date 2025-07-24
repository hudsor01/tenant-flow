// Mock data factories for testing

export const createMockUser = (overrides = {}) => ({
	id: 'user-123',
	email: 'test@tenantflow.app',
	name: 'Test User',
	phone: '+1234567890',
	role: 'owner' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})

export const createMockProperty = (overrides = {}) => ({
	id: 'property-123',
	ownerId: 'user-123',
	name: 'Test Property',
	address: '123 Test St',
	city: 'Test City',
	state: 'CA',
	zipCode: '12345',
	propertyType: 'single_family' as const,
	bedrooms: 3,
	bathrooms: 2,
	squareFootage: 1500,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})

export const createMockTenant = (overrides = {}) => ({
	id: 'tenant-123',
	email: 'tenant@tenantflow.app',
	name: 'Test Tenant',
	phone: '+1234567890',
	status: 'active' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})

export const createMockLease = (overrides = {}) => ({
	id: 'lease-123',
	propertyId: 'property-123',
	tenantId: 'tenant-123',
	startDate: '2024-01-01',
	endDate: '2024-12-31',
	rentAmount: 2000,
	depositAmount: 2000,
	status: 'active' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})

export const createMockPayment = (overrides = {}) => ({
	id: 'payment-123',
	leaseId: 'lease-123',
	tenantId: 'tenant-123',
	amount: 2000,
	dueDate: '2024-01-01',
	paidDate: '2024-01-01',
	status: 'paid' as const,
	paymentMethod: 'bank_transfer' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})

export const createMockMaintenanceRequest = (overrides = {}) => ({
	id: 'maintenance-123',
	propertyId: 'property-123',
	tenantId: 'tenant-123',
	title: 'Test Maintenance Request',
	description: 'Test maintenance description',
	priority: 'medium' as const,
	status: 'open' as const,
	category: 'plumbing' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	...overrides
})
