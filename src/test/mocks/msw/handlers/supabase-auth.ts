import { http, HttpResponse } from 'msw'
import { supabaseUrl, authUserResponse } from '../utils'

export const DEFAULT_USER_ID = 'owner-user-123'
export const DEFAULT_USER_EMAIL = 'owner@example.com'

export const supabaseAuthHandlers = [
	// getUser() - GET /auth/v1/user
	http.get(supabaseUrl('/auth/v1/user'), () => {
		return authUserResponse({
			id: DEFAULT_USER_ID,
			email: DEFAULT_USER_EMAIL
		})
	}),

	// getSession() refresh - POST /auth/v1/token
	http.post(supabaseUrl('/auth/v1/token'), () => {
		return HttpResponse.json({
			access_token: 'mock-access-token',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'mock-refresh-token',
			user: {
				id: DEFAULT_USER_ID,
				email: DEFAULT_USER_EMAIL,
				role: 'authenticated'
			}
		})
	})
]
