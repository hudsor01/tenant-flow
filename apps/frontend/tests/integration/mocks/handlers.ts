/**
 * MSW handlers for mocking backend API responses
 * Used by integration tests to avoid requiring a running backend
 *
 * Comprehensive coverage of all API endpoints with realistic data
 */

import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:4600'

// Helper to create PaginatedResponse
function createPaginatedResponse<T>(data: T[], total?: number) {
	return {
		data,
		total: total ?? data.length,
		limit: 50,
		offset: 0,
		hasMore: false
	}
}

// ============================================
// SAMPLE DATA - Realistic test fixtures
// ============================================

// Sample property data
const sampleProperty = {
	id: 'prop-1',
	property_owner_id: 'owner-1',
	name: 'Sunset Apartments',
	address_line1: '123 Main St',
	address_line2: 'Suite 100',
	city: 'San Francisco',
	state: 'CA',
	postal_code: '94102',
	country: 'USA',
	property_type: 'MULTI_FAMILY',
	status: 'active',
	date_sold: null,
	sale_price: null,
	version: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

const sampleProperty2 = {
	...sampleProperty,
	id: 'prop-2',
	name: 'Downtown Lofts',
	address_line1: '456 Market St',
	property_type: 'CONDO'
}

// Sample unit data
const sampleUnit = {
	id: 'unit-1',
	property_id: 'prop-1',
	property_owner_id: 'owner-1',
	unit_number: '101',
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	rent_amount: 2500,
	rent_currency: 'USD',
	rent_period: 'MONTHLY',
	status: 'VACANT',
	version: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

const sampleUnit2 = {
	...sampleUnit,
	id: 'unit-2',
	unit_number: '102',
	bedrooms: 1,
	bathrooms: 1,
	square_feet: 650,
	rent_amount: 1800,
	status: 'OCCUPIED'
}

// Sample tenant data
const sampleTenant = {
	id: 'tenant-1',
	user_id: 'user-1',
	first_name: 'John',
	last_name: 'Doe',
	email: 'john.doe@example.com',
	phone: '555-123-4567',
	date_of_birth: '1990-01-15',
	emergency_contact_name: 'Jane Doe',
	emergency_contact_phone: '555-987-6543',
	emergency_contact_relationship: 'spouse',
	identity_verified: true,
	ssn_last_four: '1234',
	stripe_customer_id: 'cus_test123',
	notification_preferences: { email: true, sms: false },
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

// Sample lease data
const sampleLease = {
	id: 'lease-1',
	property_owner_id: 'owner-1',
	unit_id: 'unit-1',
	tenant_id: 'tenant-1',
	start_date: new Date().toISOString(),
	end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
	rent_amount: 2500,
	rent_currency: 'USD',
	rent_period: 'MONTHLY',
	security_deposit: 2500,
	status: 'active',
	lease_document_url: null,
	signed_at: null,
	version: 1,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

// Sample maintenance data
const sampleMaintenance = {
	id: 'maint-1',
	property_owner_id: 'owner-1',
	unit_id: 'unit-1',
	tenant_id: 'tenant-1',
	title: 'Leaking Faucet',
	description: 'Kitchen faucet is leaking water',
	category: 'PLUMBING',
	priority: 'MEDIUM',
	status: 'pending',
	requested_by: 'tenant',
	assigned_to: null,
	scheduled_date: null,
	inspection_date: null,
	inspector_id: null,
	inspection_findings: null,
	estimated_cost: 150,
	actual_cost: null,
	completed_at: null,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

// Sample stats
const samplePropertyStats = {
	total: 5,
	active: 4,
	sold: 1,
	totalUnits: 25,
	occupiedUnits: 20,
	vacantUnits: 5,
	occupancyRate: 80
}

const sampleUnitStats = {
	total: 25,
	vacant: 5,
	occupied: 20,
	maintenance: 0
}

const sampleLeaseStats = {
	total: 20,
	active: 18,
	expiring: 3,
	expired: 2
}

const sampleTenantStats = {
	total: 20,
	active: 18,
	pending: 2
}

// Sample analytics
const samplePropertyPerformance = [
	{
		property_id: 'prop-1',
		property_name: 'Sunset Apartments',
		occupancy_rate: 85,
		revenue: 45000,
		expenses: 12000,
		net_income: 33000
	}
]

const sampleOccupancyAnalytics = {
	overall_occupancy: 80,
	by_property: [
		{ property_id: 'prop-1', name: 'Sunset Apartments', rate: 85 }
	],
	trend: [{ month: 'Jan', rate: 78 }, { month: 'Feb', rate: 80 }]
}

const sampleFinancialAnalytics = {
	total_revenue: 125000,
	total_expenses: 35000,
	net_income: 90000,
	by_property: []
}

const sampleMaintenanceAnalytics = {
	total_requests: 45,
	pending: 5,
	in_progress: 8,
	completed: 32,
	avg_resolution_days: 3.5
}

// ============================================
// MSW HANDLERS
// ============================================

export const handlers = [
	// ============================================
	// HEALTH CHECK
	// ============================================
	http.get(`${BASE_URL}/health`, () => {
		return HttpResponse.json({
			status: 'ok',
			timestamp: new Date().toISOString()
		})
	}),

	// ============================================
	// PROPERTIES ENDPOINTS
	// ============================================

	// GET /api/v1/properties - List properties
	http.get(`${BASE_URL}/api/v1/properties`, ({ request }) => {
		const url = new URL(request.url)
		const search = url.searchParams.get('search')
		const status = url.searchParams.get('status')

		let properties = [sampleProperty, sampleProperty2]

		if (search) {
			properties = properties.filter(p =>
				p.name.toLowerCase().includes(search.toLowerCase()) ||
				p.address_line1.toLowerCase().includes(search.toLowerCase())
			)
		}

		if (status) {
			properties = properties.filter(p => p.status === status)
		}

		return HttpResponse.json(createPaginatedResponse(properties))
	}),

	// GET /api/v1/properties/stats
	http.get(`${BASE_URL}/api/v1/properties/stats`, () => {
		return HttpResponse.json(samplePropertyStats)
	}),

	// GET /api/v1/properties/with-units
	http.get(`${BASE_URL}/api/v1/properties/with-units`, () => {
		return HttpResponse.json([
			{ ...sampleProperty, units: [sampleUnit, sampleUnit2] }
		])
	}),

	// GET /api/v1/properties/analytics/performance
	http.get(`${BASE_URL}/api/v1/properties/analytics/performance`, () => {
		return HttpResponse.json(samplePropertyPerformance)
	}),

	// GET /api/v1/property-performance (dashboard endpoint)
	http.get(`${BASE_URL}/api/v1/property-performance`, () => {
		return HttpResponse.json(samplePropertyPerformance)
	}),

	// GET /api/v1/properties/analytics/occupancy
	http.get(`${BASE_URL}/api/v1/properties/analytics/occupancy`, () => {
		return HttpResponse.json(sampleOccupancyAnalytics)
	}),

	// GET /api/v1/properties/analytics/financial
	http.get(`${BASE_URL}/api/v1/properties/analytics/financial`, () => {
		return HttpResponse.json(sampleFinancialAnalytics)
	}),

	// GET /api/v1/properties/analytics/maintenance
	http.get(`${BASE_URL}/api/v1/properties/analytics/maintenance`, () => {
		return HttpResponse.json(sampleMaintenanceAnalytics)
	}),

	// GET /api/v1/properties/:id - Get single property
	http.get(`${BASE_URL}/api/v1/properties/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Property not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		if (id === 'prop-2') {
			return HttpResponse.json(sampleProperty2)
		}
		return HttpResponse.json(sampleProperty)
	}),

	// POST /api/v1/properties - Create property
	http.post(`${BASE_URL}/api/v1/properties`, async ({ request }) => {
		const body = await request.json() as Record<string, unknown>
		const newProperty = {
			...sampleProperty,
			id: `prop-${Date.now()}`,
			...body,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(newProperty, { status: 201 })
	}),

	// PUT /api/v1/properties/:id - Update property
	http.put(`${BASE_URL}/api/v1/properties/:id`, async ({ params, request }) => {
		const { id } = params
		const body = await request.json() as Record<string, unknown>

		// Simulate version conflict
		if (body.version && body.version < 1) {
			return HttpResponse.json(
				{ message: 'Version conflict', code: 'CONFLICT', statusCode: 409 },
				{ status: 409 }
			)
		}

		const updatedProperty = {
			...sampleProperty,
			id,
			...body,
			version: ((body.version as number) || 0) + 1,
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(updatedProperty)
	}),

	// DELETE /api/v1/properties/:id - Delete property
	http.delete(`${BASE_URL}/api/v1/properties/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Property not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json({ message: 'Property deleted successfully' })
	}),

	// PUT /api/v1/properties/:id/mark-sold
	http.put(`${BASE_URL}/api/v1/properties/:id/mark-sold`, async ({ params, request }) => {
		const { id } = params
		const body = await request.json() as Record<string, unknown>
		return HttpResponse.json({
			success: true,
			message: `Property ${id} marked as sold`
		})
	}),

	// ============================================
	// UNITS ENDPOINTS
	// ============================================

	// GET /api/v1/units
	http.get(`${BASE_URL}/api/v1/units`, ({ request }) => {
		const url = new URL(request.url)
		const property_id = url.searchParams.get('property_id')
		const status = url.searchParams.get('status')

		let units = [sampleUnit, sampleUnit2]

		if (property_id) {
			units = units.filter(u => u.property_id === property_id)
		}

		if (status) {
			units = units.filter(u => u.status === status)
		}

		return HttpResponse.json(createPaginatedResponse(units))
	}),

	// GET /api/v1/units/stats
	http.get(`${BASE_URL}/api/v1/units/stats`, () => {
		return HttpResponse.json(sampleUnitStats)
	}),

	// GET /api/v1/units/by-property/:propertyId
	http.get(`${BASE_URL}/api/v1/units/by-property/:propertyId`, () => {
		return HttpResponse.json([sampleUnit, sampleUnit2])
	}),

	// GET /api/v1/units/:id
	http.get(`${BASE_URL}/api/v1/units/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Unit not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		if (id === 'unit-2') {
			return HttpResponse.json(sampleUnit2)
		}
		return HttpResponse.json(sampleUnit)
	}),

	// POST /api/v1/units
	http.post(`${BASE_URL}/api/v1/units`, async ({ request }) => {
		const body = await request.json() as Record<string, unknown>
		const newUnit = {
			...sampleUnit,
			id: `unit-${Date.now()}`,
			...body,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(newUnit, { status: 201 })
	}),

	// PUT /api/v1/units/:id
	http.put(`${BASE_URL}/api/v1/units/:id`, async ({ params, request }) => {
		const { id } = params
		const body = await request.json() as Record<string, unknown>
		const updatedUnit = {
			...sampleUnit,
			id,
			...body,
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(updatedUnit)
	}),

	// DELETE /api/v1/units/:id
	http.delete(`${BASE_URL}/api/v1/units/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Unit not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json({ message: 'Unit deleted successfully' })
	}),

	// ============================================
	// TENANTS ENDPOINTS
	// ============================================

	// GET /api/v1/tenants
	http.get(`${BASE_URL}/api/v1/tenants`, ({ request }) => {
		const url = new URL(request.url)
		const search = url.searchParams.get('search')

		let tenants = [sampleTenant]

		if (search) {
			tenants = tenants.filter(t =>
				t.first_name?.toLowerCase().includes(search.toLowerCase()) ||
				t.last_name?.toLowerCase().includes(search.toLowerCase()) ||
				t.email?.toLowerCase().includes(search.toLowerCase())
			)
		}

		return HttpResponse.json(createPaginatedResponse(tenants))
	}),

	// GET /api/v1/tenants/stats
	http.get(`${BASE_URL}/api/v1/tenants/stats`, () => {
		return HttpResponse.json(sampleTenantStats)
	}),

	// GET /api/v1/tenants/with-lease
	http.get(`${BASE_URL}/api/v1/tenants/with-lease`, () => {
		return HttpResponse.json([
			{ ...sampleTenant, lease: sampleLease, unit: sampleUnit }
		])
	}),

	// GET /api/v1/tenants/:id
	http.get(`${BASE_URL}/api/v1/tenants/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Tenant not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json(sampleTenant)
	}),

	// POST /api/v1/tenants
	http.post(`${BASE_URL}/api/v1/tenants`, async ({ request }) => {
		const body = await request.json() as Record<string, unknown>
		const newTenant = {
			...sampleTenant,
			id: `tenant-${Date.now()}`,
			...body,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(newTenant, { status: 201 })
	}),

	// PUT /api/v1/tenants/:id
	http.put(`${BASE_URL}/api/v1/tenants/:id`, async ({ params, request }) => {
		const { id } = params
		const body = await request.json() as Record<string, unknown>
		const updatedTenant = {
			...sampleTenant,
			id,
			...body,
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(updatedTenant)
	}),

	// DELETE /api/v1/tenants/:id
	http.delete(`${BASE_URL}/api/v1/tenants/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Tenant not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json({ message: 'Tenant deleted successfully' })
	}),

	// ============================================
	// LEASES ENDPOINTS
	// ============================================

	// GET /api/v1/leases
	http.get(`${BASE_URL}/api/v1/leases`, ({ request }) => {
		const url = new URL(request.url)
		const status = url.searchParams.get('status')

		let leases = [sampleLease]

		if (status) {
			leases = leases.filter(l => l.status === status)
		}

		return HttpResponse.json(createPaginatedResponse(leases))
	}),

	// GET /api/v1/leases/stats
	http.get(`${BASE_URL}/api/v1/leases/stats`, () => {
		return HttpResponse.json(sampleLeaseStats)
	}),

	// GET /api/v1/leases/expiring
	http.get(`${BASE_URL}/api/v1/leases/expiring`, () => {
		return HttpResponse.json([sampleLease])
	}),

	// GET /api/v1/leases/analytics/performance
	http.get(`${BASE_URL}/api/v1/leases/analytics/performance`, () => {
		return HttpResponse.json({
			avg_lease_duration: 12,
			renewal_rate: 75,
			on_time_payments: 92
		})
	}),

	// GET /api/v1/leases/analytics/duration
	http.get(`${BASE_URL}/api/v1/leases/analytics/duration`, () => {
		return HttpResponse.json({
			avg_duration_months: 12,
			by_property: []
		})
	}),

	// GET /api/v1/leases/analytics/turnover
	http.get(`${BASE_URL}/api/v1/leases/analytics/turnover`, () => {
		return HttpResponse.json({
			turnover_rate: 15,
			avg_vacancy_days: 21
		})
	}),

	// GET /api/v1/leases/analytics/revenue
	http.get(`${BASE_URL}/api/v1/leases/analytics/revenue`, () => {
		return HttpResponse.json({
			total_revenue: 125000,
			by_month: []
		})
	}),

	// GET /api/v1/leases/:id
	http.get(`${BASE_URL}/api/v1/leases/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Lease not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json(sampleLease)
	}),

	// GET /api/v1/leases/:id/signature-status
	http.get(`${BASE_URL}/api/v1/leases/:id/signature-status`, ({ params }) => {
		return HttpResponse.json({
			lease_id: params.id,
			status: 'pending',
			owner_signed: false,
			tenant_signed: false
		})
	}),

	// GET /api/v1/tenant-portal/lease
	http.get(`${BASE_URL}/api/v1/tenant-portal/lease`, () => {
		return HttpResponse.json({
			...sampleLease,
			metadata: { documentUrl: null }
		})
	}),

	// POST /api/v1/leases
	http.post(`${BASE_URL}/api/v1/leases`, async ({ request }) => {
		const body = await request.json() as Record<string, unknown>
		const newLease = {
			...sampleLease,
			id: `lease-${Date.now()}`,
			...body,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(newLease, { status: 201 })
	}),

	// PUT /api/v1/leases/:id
	http.put(`${BASE_URL}/api/v1/leases/:id`, async ({ params, request }) => {
		const { id } = params
		const body = await request.json() as Record<string, unknown>
		const updatedLease = {
			...sampleLease,
			id,
			...body,
			updated_at: new Date().toISOString()
		}
		return HttpResponse.json(updatedLease)
	}),

	// DELETE /api/v1/leases/:id
	http.delete(`${BASE_URL}/api/v1/leases/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Lease not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json({ message: 'Lease deleted successfully' })
	}),

	// ============================================
	// MAINTENANCE ENDPOINTS
	// ============================================

	// GET /api/v1/maintenance
	http.get(`${BASE_URL}/api/v1/maintenance`, ({ request }) => {
		const url = new URL(request.url)
		const status = url.searchParams.get('status')

		let requests = [sampleMaintenance]

		if (status) {
			requests = requests.filter(m => m.status === status)
		}

		return HttpResponse.json(createPaginatedResponse(requests))
	}),

	// GET /api/v1/maintenance/:id
	http.get(`${BASE_URL}/api/v1/maintenance/:id`, ({ params }) => {
		const { id } = params
		if (id === '00000000-0000-0000-0000-000000000000') {
			return HttpResponse.json(
				{ message: 'Maintenance request not found', statusCode: 404 },
				{ status: 404 }
			)
		}
		return HttpResponse.json(sampleMaintenance)
	}),

	// ============================================
	// RENT PAYMENTS ENDPOINTS
	// ============================================

	// GET /api/v1/rent-payments
	http.get(`${BASE_URL}/api/v1/rent-payments`, () => {
		return HttpResponse.json(createPaginatedResponse([]))
	})
]
