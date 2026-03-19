import { http } from 'msw'
import { supabaseUrl, postgrestList, postgrestSingle } from '../utils'
import { DEFAULT_LEASE } from '#test/utils/test-data'

export const leaseHandlers = [
	http.get(supabaseUrl('/rest/v1/leases'), () => {
		return postgrestList([DEFAULT_LEASE], 1)
	}),
	http.post(supabaseUrl('/rest/v1/leases'), () => {
		return postgrestSingle(DEFAULT_LEASE)
	}),
	http.patch(supabaseUrl('/rest/v1/leases'), () => {
		return postgrestSingle(DEFAULT_LEASE)
	}),
	http.delete(supabaseUrl('/rest/v1/leases'), () => {
		return postgrestSingle(DEFAULT_LEASE)
	}),

	// Lease tenants
	http.get(supabaseUrl('/rest/v1/lease_tenants'), () => {
		return postgrestList([], 0)
	})
]
