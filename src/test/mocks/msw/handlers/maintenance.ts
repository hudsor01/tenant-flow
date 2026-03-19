import { http } from 'msw'
import { supabaseUrl, postgrestList, postgrestSingle } from '../utils'
import { DEFAULT_MAINTENANCE_REQUEST } from '#test/utils/test-data'

export const maintenanceHandlers = [
	http.get(supabaseUrl('/rest/v1/maintenance_requests'), () => {
		return postgrestList([DEFAULT_MAINTENANCE_REQUEST], 1)
	}),
	http.post(supabaseUrl('/rest/v1/maintenance_requests'), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST)
	}),
	http.patch(supabaseUrl('/rest/v1/maintenance_requests'), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST)
	}),
	http.delete(supabaseUrl('/rest/v1/maintenance_requests'), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST)
	})
]
