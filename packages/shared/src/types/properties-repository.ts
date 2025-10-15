import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from './backend-domain.js'
import type { Property, PropertyStats } from './core.js'
import type { BaseFilterOptions, BaseRepository } from './repository-base.js'

export interface PropertyFilterOptions extends BaseFilterOptions {
	status?: string
	propertyType?: string
	city?: string
	state?: string
}

export interface PropertySearchOptions {
	search?: string | null | undefined
	limit: number
	offset: number
}

export interface PropertyAnalyticsOptions {
	propertyId?: string
	timeframe?: string
	period?: string
	limit?: number
}

export interface PropertyPerformanceAnalytics {
	propertyId: string
	propertyName: string
	period: string
	occupancyRate: number
	revenue: number
	expenses: number
	netIncome: number
	roi: number
}

export interface PropertyOccupancyAnalytics {
	propertyId: string
	propertyName: string
	period: string
	occupancyRate: number
	unitsOccupied: number
	unitsTotal: number
	moveIns: number
	moveOuts: number
}

export interface PropertyFinancialAnalytics {
	propertyId: string
	propertyName: string
	period: string
	revenue: number
	expenses: number
	netIncome: number
	operatingExpenses: number
	maintenanceExpenses: number
	capexExpenses: number
	cashFlow: number
}

export interface PropertyMaintenanceAnalytics {
	propertyId: string
	propertyName: string
	period: string
	totalRequests: number
	completedRequests: number
	pendingRequests: number
	avgResolutionTime: number
	totalCost: number
	avgCost: number
	emergencyRequests: number
}

export interface CreatePropertyData {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	propertyType: string
	description?: string
	imageUrl?: string
}

export interface UpdatePropertyData {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	propertyType?: string
	description?: string
	imageUrl?: string
	status?: string
}

export interface PropertiesRepositoryContract
	extends BaseRepository<
		Property,
		CreatePropertyRequest,
		UpdatePropertyRequest,
		PropertyFilterOptions
	> {
	findByUserIdWithSearch(
		userId: string,
		options: PropertySearchOptions
	): Promise<Property[]>
	findAllWithUnits(
		userId: string,
		options: PropertySearchOptions
	): Promise<Property[]>
	getStats(userId: string): Promise<PropertyStats>
	getPerformanceAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyPerformanceAnalytics[]>
	getOccupancyAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyOccupancyAnalytics[]>
	getFinancialAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyFinancialAnalytics[]>
	getMaintenanceAnalytics(
		userId: string,
		options: PropertyAnalyticsOptions
	): Promise<PropertyMaintenanceAnalytics[]>
	softDelete(
		userId: string,
		propertyId: string
	): Promise<{ success: boolean; message: string }>
}
