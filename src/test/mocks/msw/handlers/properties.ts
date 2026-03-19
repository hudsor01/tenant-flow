import { http } from 'msw'
import { supabaseUrl, postgrestList, postgrestSingle } from '../utils'
import { DEFAULT_PROPERTY } from '#test/utils/test-data'

export const propertyHandlers = [
	http.get(supabaseUrl('/rest/v1/properties'), () => {
		return postgrestList([DEFAULT_PROPERTY], 1)
	}),

	http.post(supabaseUrl('/rest/v1/properties'), () => {
		return postgrestSingle(DEFAULT_PROPERTY)
	}),

	http.patch(supabaseUrl('/rest/v1/properties'), () => {
		return postgrestSingle(DEFAULT_PROPERTY)
	}),

	http.delete(supabaseUrl('/rest/v1/properties'), () => {
		return postgrestSingle(DEFAULT_PROPERTY)
	})
]
