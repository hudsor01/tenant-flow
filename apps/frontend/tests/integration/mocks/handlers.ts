/**
 * MSW handlers for mocking backend API responses
 * Used by integration tests to avoid requiring a running backend
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

// Sample property data
const sampleProperty = {
	id: 'prop-1',
	property_owner_id: 'owner-1',
	name: 'Test Property',
	address_line1: '123 Test St',
	address_line2: null,
	city: 'Test City',
	state: 'TS',
	postal_code: '12345',
	country: 'USA',
	property_type: 'SINGLE_FAMILY',
	status: 'active',
	date_sold: null,
	sale_price: null,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

// Sample maintenance data
const sampleMaintenance = {
	id: 'maint-1',
	property_owner_id: 'owner-1',
	unit_id: 'unit-1',
	tenant_id: 'tenant-1',
	title: 'Test Maintenance Request',
	description: 'Test description',
	category: 'GENERAL',
	priority: 'MEDIUM',
	status: 'PENDING',
	requested_by: null,
	assigned_to: null,
	scheduled_date: null,
	inspection_date: null,
	inspector_id: null,
	inspection_findings: null,
	estimated_cost: null,
	actual_cost: null,
	completed_at: null,
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
	rent_amount: 1500,
	rent_currency: 'USD',
	rent_period: 'MONTHLY',
	security_deposit: 1500,
	status: 'active',
	lease_document_url: null,
	signed_at: null,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
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
	rent_amount: 1500,
	rent_currency: 'USD',
	rent_period: 'MONTHLY',
	status: 'VACANT',
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

// Sample tenant data
const sampleTenant = {
	id: 'tenant-1',
	user_id: 'user-1',
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
	stripe_customer_id: null,
	notification_preferences: null,
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString()
}

export const handlers = [
	// Health check
	http.get(`${BASE_URL}/health`, () => {
		return HttpResponse.json({
			status: 'ok',
			timestamp: new Date().toISOString()
		})
	}),

	// Properties endpoints
	http.get(`${BASE_URL}/api/v1/properties`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleProperty]))
	}),

	http.get(`${BASE_URL}/api/v1/properties/:id`, ({ params }) => {
		if (params.id === '00000000-0000-0000-0000-000000000000') {
			return new HttpResponse(null, { status: 404 })
		}
		return HttpResponse.json({ data: sampleProperty })
	}),

	// Maintenance endpoints
	http.get(`${BASE_URL}/api/v1/maintenance`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleMaintenance]))
	}),

	http.get(`${BASE_URL}/api/v1/maintenance/:id`, ({ params }) => {
		if (params.id === '00000000-0000-0000-0000-000000000000') {
			return new HttpResponse(null, { status: 404 })
		}
		return HttpResponse.json({ data: sampleMaintenance })
	}),

	// Leases endpoints
	http.get(`${BASE_URL}/api/v1/leases`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleLease]))
	}),

	http.get(`${BASE_URL}/api/v1/leases/:id`, ({ params }) => {
		if (params.id === '00000000-0000-0000-0000-000000000000') {
			return new HttpResponse(null, { status: 404 })
		}
		return HttpResponse.json({ data: sampleLease })
	}),

	// Units endpoints
	http.get(`${BASE_URL}/api/v1/units`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleUnit]))
	}),

	http.get(`${BASE_URL}/api/v1/properties/:propertyId/units`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleUnit]))
	}),

	http.get(`${BASE_URL}/api/v1/units/:id`, ({ params }) => {
		if (params.id === '00000000-0000-0000-0000-000000000000') {
			return new HttpResponse(null, { status: 404 })
		}
		return HttpResponse.json({ data: sampleUnit })
	}),

	// Tenants endpoints
	http.get(`${BASE_URL}/api/v1/tenants`, () => {
		return HttpResponse.json(createPaginatedResponse([sampleTenant]))
	}),

	http.get(`${BASE_URL}/api/v1/tenants/:id`, ({ params }) => {
		if (params.id === '00000000-0000-0000-0000-000000000000') {
			return new HttpResponse(null, { status: 404 })
		}
		return HttpResponse.json({ data: sampleTenant })
	}),

	// Rent payments endpoints
	http.get(`${BASE_URL}/api/v1/rent-payments`, () => {
		return HttpResponse.json(createPaginatedResponse([]))
	})
]
