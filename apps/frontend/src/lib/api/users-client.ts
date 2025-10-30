import type { UpdateProfileInput } from '@repo/shared/validation/profile'
import { getApiBaseUrl } from '@repo/shared/utils/api-utils'

const API_BASE_URL = getApiBaseUrl()

async function fetchWithAuth(
	url: string,
	token: string,
	options?: RequestInit
) {
	const response = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...options?.headers
		},
		cache: 'no-store'
	})

	if (!response.ok) {
		const { ApiErrorCode, createApiErrorFromResponse } = await import(
			'@repo/shared/utils/api-error'
		)
		throw createApiErrorFromResponse(
			response,
			ApiErrorCode.API_SERVER_ERROR
		)
	}

	return response.json()
}

export async function updateProfile(
	token: string,
	profileData: UpdateProfileInput
) {
	const url = `${API_BASE_URL}/users/profile`
	return fetchWithAuth(url, token, {
		method: 'PATCH',
		body: JSON.stringify(profileData)
	})
}
