/**
 * Create property hook
 * Provides property creation functionality
 */

import { useState } from 'react'
import { ApiService } from '@/lib/api/api-service'
import type { CreatePropertyInput, Property } from '@repo/shared'

export function useCreateProperty() {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const createProperty = async (data: CreatePropertyInput): Promise<Property | null> => {
		setIsLoading(true)
		setError(null)
		try {
			const property = await ApiService.createProperty(data)
			return property
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to create property'
			setError(errorMessage)
			return null
		} finally {
			setIsLoading(false)
		}
	}

	return {
		createProperty,
		isLoading,
		error
	}
}