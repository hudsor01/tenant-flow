import type { HttpClient } from './http-client'
import type { NotificationType } from '@/types/entities'

// Activity types - can be expanded based on actual needs
export interface ActivityItem {
	id: string
	userId: string
	userName?: string
	action: string
	entityType: NotificationType
	entityId: string
	entityName?: string
	metadata?: Record<string, unknown>
	createdAt: string
	priority?: 'low' | 'medium' | 'high'
	// Legacy fields for backwards compatibility
	type?: 'payment' | 'maintenance' | 'lease' | 'tenant' | 'property'
	description?: string
	timestamp?: string
}

export interface ActivityFeed {
	items: ActivityItem[]
	hasMore: boolean
	nextCursor?: string
}

export interface ActivityQuery {
	limit?: number
	cursor?: string
	type?: string
	since?: string
	userId?: string
	[key: string]: unknown
}

export class ActivityClient {
	constructor(private http: HttpClient) {}

	async getFeed(limitOrQuery?: number | ActivityQuery): Promise<ActivityFeed> {
		let params: Record<string, string> | undefined
		
		if (typeof limitOrQuery === 'number') {
			params = { limit: String(limitOrQuery) }
		} else if (limitOrQuery) {
			params = this.buildQueryParams(limitOrQuery)
		}
		
		return this.http.get<ActivityFeed>('/activity/feed', params)
	}

	async getRealtime(limitOrQuery?: number | ActivityQuery): Promise<{ 
		data: ActivityItem[], 
		isConnected: boolean, 
		hasNewActivities: boolean 
	}> {
		let params: Record<string, string> | undefined
		
		if (typeof limitOrQuery === 'number') {
			params = { limit: String(limitOrQuery) }
		} else if (limitOrQuery) {
			params = this.buildQueryParams(limitOrQuery)
		}
		
		const data = await this.http.get<ActivityItem[]>('/activity/realtime', params)
		return {
			data,
			isConnected: true,
			hasNewActivities: data.length > 0
		}
	}

	// Utility method to build query parameters
	private buildQueryParams(params: Record<string, unknown>): Record<string, string> {
		const result: Record<string, string> = {}

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				result[key] = String(value)
			}
		})

		return result
	}
}