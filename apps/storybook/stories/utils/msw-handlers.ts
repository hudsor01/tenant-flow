import { http, HttpResponse } from 'msw'
import {
	mockProperties,
	mockTenants,
	mockMaintenanceRequests,
	mockStats
} from './mockData'

// API handlers for Storybook MSW
export const handlers = [
	// Properties API
	http.get('/api/properties', () => {
		return HttpResponse.json({
			success: true,
			data: mockProperties,
			pagination: {
				total: mockProperties.length,
				page: 1,
				limit: 10
			}
		})
	}),

	http.get('/api/properties/:id', ({ params }) => {
		const { id } = params
		const property = mockProperties.find(p => p.id === id)

		if (!property) {
			return new HttpResponse(null, { status: 404 })
		}

		return HttpResponse.json({
			success: true,
			data: property
		})
	}),

	http.post('/api/properties', async ({ request }) => {
		const data = await request.json()
		const newProperty = {
			id: String(mockProperties.length + 1),
			...(data as any),
			status: 'Active',
			occupied: 0,
			occupancyRate: 0
		}

		return HttpResponse.json(
			{
				success: true,
				data: newProperty
			},
			{ status: 201 }
		)
	}),

	http.patch('/api/properties/:id', async ({ params, request }) => {
		const { id } = params
		const updates = await request.json()
		const property = mockProperties.find(p => p.id === id)

		if (!property) {
			return new HttpResponse(null, { status: 404 })
		}

		const updatedProperty = { ...property, ...(updates as any) }

		return HttpResponse.json({
			success: true,
			data: updatedProperty
		})
	}),

	http.delete('/api/properties/:id', ({ params }) => {
		const { id } = params
		const exists = mockProperties.some(p => p.id === id)

		if (!exists) {
			return new HttpResponse(null, { status: 404 })
		}

		return HttpResponse.json({
			success: true,
			message: 'Property deleted successfully'
		})
	}),

	// Tenants API
	http.get('/api/tenants', () => {
		return HttpResponse.json({
			success: true,
			data: mockTenants,
			pagination: {
				total: mockTenants.length,
				page: 1,
				limit: 10
			}
		})
	}),

	http.get('/api/tenants/:id', ({ params }) => {
		const { id } = params
		const tenant = mockTenants.find(t => t.id === id)

		if (!tenant) {
			return new HttpResponse(null, { status: 404 })
		}

		return HttpResponse.json({
			success: true,
			data: tenant
		})
	}),

	http.post('/api/tenants', async ({ request }) => {
		const data = await request.json()
		const newTenant = {
			id: String(mockTenants.length + 1),
			...(data as any),
			status: 'Active'
		}

		return HttpResponse.json(
			{
				success: true,
				data: newTenant
			},
			{ status: 201 }
		)
	}),

	http.patch('/api/tenants/:id', async ({ params, request }) => {
		const { id } = params
		const updates = await request.json()
		const tenant = mockTenants.find(t => t.id === id)

		if (!tenant) {
			return new HttpResponse(null, { status: 404 })
		}

		const updatedTenant = { ...tenant, ...(updates as any) }

		return HttpResponse.json({
			success: true,
			data: updatedTenant
		})
	}),

	// Maintenance Requests API
	http.get('/api/maintenance', () => {
		return HttpResponse.json({
			success: true,
			data: mockMaintenanceRequests,
			pagination: {
				total: mockMaintenanceRequests.length,
				page: 1,
				limit: 10
			}
		})
	}),

	http.get('/api/maintenance/:id', ({ params }) => {
		const { id } = params
		const request = mockMaintenanceRequests.find(r => r.id === id)

		if (!request) {
			return new HttpResponse(null, { status: 404 })
		}

		return HttpResponse.json({
			success: true,
			data: request
		})
	}),

	http.post('/api/maintenance', async ({ request }) => {
		const data = await request.json()
		const newRequest = {
			id: String(mockMaintenanceRequests.length + 1),
			...(data as any),
			status: 'Open',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		return HttpResponse.json(
			{
				success: true,
				data: newRequest
			},
			{ status: 201 }
		)
	}),

	http.patch('/api/maintenance/:id', async ({ params, request }) => {
		const { id } = params
		const updates = await request.json()
		const maintenanceRequest = mockMaintenanceRequests.find(
			r => r.id === id
		)

		if (!maintenanceRequest) {
			return new HttpResponse(null, { status: 404 })
		}

		const updatedRequest = {
			...maintenanceRequest,
			...(updates as any),
			updatedAt: new Date().toISOString()
		}

		return HttpResponse.json({
			success: true,
			data: updatedRequest
		})
	}),

	// Dashboard/Stats API
	http.get('/api/dashboard/stats', () => {
		return HttpResponse.json({
			success: true,
			data: mockStats
		})
	}),

	// Notification/Communication APIs
	http.post('/api/notifications/send', async ({ request }) => {
		const data = await request.json()

		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 1000))

		return HttpResponse.json({
			success: true,
			message: 'Notification sent successfully',
			data: { id: Date.now(), ...(data as any) }
		})
	}),

	http.post('/api/tenants/:id/contact', async ({ params, request }) => {
		const { id } = params
		const data = await request.json()

		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 800))

		return HttpResponse.json({
			success: true,
			message: 'Message sent to tenant',
			data: {
				tenantId: id,
				messageId: Date.now(),
				...(data as any),
				sentAt: new Date().toISOString()
			}
		})
	}),

	// Vendor/Assignment APIs
	http.post('/api/maintenance/:id/assign', async ({ params, request }) => {
		const { id } = params
		const data = await request.json()

		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 1200))

		return HttpResponse.json({
			success: true,
			message: 'Vendor assigned successfully',
			data: {
				maintenanceId: id,
				assignmentId: Date.now(),
				...(data as any),
				assignedAt: new Date().toISOString()
			}
		})
	}),

	// Error simulation handlers
	http.get('/api/error/500', () => {
		return new HttpResponse(null, { status: 500 })
	}),

	http.get('/api/error/404', () => {
		return new HttpResponse(null, { status: 404 })
	}),

	http.get('/api/slow', async () => {
		// Simulate slow API
		await new Promise(resolve => setTimeout(resolve, 3000))
		return HttpResponse.json({ success: true, message: 'Slow response' })
	})
]

// Helper function to create error responses
export const createErrorResponse = (status: number, message: string) => {
	return HttpResponse.json(
		{
			success: false,
			error: {
				status,
				message,
				timestamp: new Date().toISOString()
			}
		},
		{ status }
	)
}
