/**
 * Properties API client
 * Provides property related API calls
 */

import { ApiService } from './api-service'
import type { 
	Property, 
	CreatePropertyInput, 
	UpdatePropertyInput,
	PropertyQuery,
	DashboardStats
} from '@repo/shared'

export class PropertiesApi {
	static async getProperties(query?: PropertyQuery): Promise<Property[]> {
		return ApiService.getProperties(query)
	}

	static async getProperty(id: string): Promise<Property> {
		return ApiService.getProperty(id)
	}

	static async createProperty(data: CreatePropertyInput): Promise<Property> {
		return ApiService.createProperty(data)
	}

	static async updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
		return ApiService.updateProperty(id, data)
	}

	static async deleteProperty(id: string): Promise<{ message: string }> {
		return ApiService.deleteProperty(id)
	}

	static async getPropertyStats(): Promise<DashboardStats> {
		return ApiService.getDashboardOverview()
	}

	static async uploadPropertyImage(id: string, file: File): Promise<{ url: string }> {
		const formData = new FormData()
		formData.append('image', file)
		return ApiService.uploadPropertyImage(id, formData)
	}
}