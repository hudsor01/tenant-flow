import type { HttpClient } from './http-client'

export interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	services: {
		database: 'up' | 'down'
		auth: 'up' | 'down'
		storage: 'up' | 'down'
		email: 'up' | 'down'
	}
	version: string
	uptime: number
}

export class HealthClient {
	constructor(private http: HttpClient) {}

	async check(): Promise<HealthStatus> {
		return this.http.get<HealthStatus>('/health')
	}
}