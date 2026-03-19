import { http } from 'msw'
import { supabaseUrl, rpcResponse } from '../utils'

export const rpcHandlers = [
	// Dashboard stats
	http.post(supabaseUrl('/rest/v1/rpc/get_dashboard_stats'), () => {
		return rpcResponse({
			total_properties: 5,
			total_units: 20,
			total_tenants: 15,
			total_leases: 12,
			occupied_units: 15,
			vacancy_rate: 25,
			monthly_revenue: 22500,
			active_maintenance: 3
		})
	}),

	// Lease stats
	http.post(supabaseUrl('/rest/v1/rpc/get_lease_stats'), () => {
		return rpcResponse({
			active_leases: 12,
			expiring_soon: 2,
			expired: 1
		})
	}),

	// Maintenance stats
	http.post(supabaseUrl('/rest/v1/rpc/get_maintenance_stats'), () => {
		return rpcResponse({
			open: 3,
			in_progress: 2,
			completed: 10
		})
	}),

	// User profile
	http.post(supabaseUrl('/rest/v1/rpc/get_user_profile'), () => {
		return rpcResponse({
			id: 'owner-user-123',
			email: 'owner@example.com',
			full_name: 'Test Owner',
			user_type: 'OWNER'
		})
	}),

	// Fallback: any unhandled RPC returns null
	http.post(supabaseUrl('/rest/v1/rpc/:functionName'), () => {
		return rpcResponse(null)
	})
]
