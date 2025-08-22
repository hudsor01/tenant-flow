/**
 * @deprecated Use the unified apiClient from '../api-client' instead
 * This wrapper is maintained for backward compatibility only
 */

import { apiClient } from '../api-client'
import type { 
	Property, 
	CreatePropertyInput, 
	UpdatePropertyInput,
	PropertyQuery,
	DashboardStats
} from '@repo/shared'

export class PropertiesApi {
	static async getProperties(query?: PropertyQuery): Promise<Property[]> {
		return apiClient.getProperties(query)
	}

	static async getProperty(id: string): Promise<Property> {
		return apiClient.getProperty(id)
	}

	static async createProperty(data: CreatePropertyInput): Promise<Property> {
		return apiClient.createProperty(data)
	}

	static async updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
		return apiClient.updateProperty(id, data)
	}

	static async deleteProperty(id: string): Promise<{ message: string }> {
		return apiClient.deleteProperty(id)
	}

	static async getPropertyStats(): Promise<DashboardStats> {
		return apiClient.getDashboardOverview()
	}

	static async uploadPropertyImage(id: string, file: File): Promise<{ url: string }> {
		const formData = new FormData()
		formData.append('image', file)
		return apiClient.uploadPropertyImage(id, formData)
	}
}