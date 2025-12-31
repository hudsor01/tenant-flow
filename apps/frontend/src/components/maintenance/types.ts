// Maintenance Section Types
// Import database enums from shared types (single source of truth)
import type { MaintenanceStatus, MaintenancePriority } from '@repo/shared/types/core'

export interface MaintenanceProps {
	// Request list
	requests: MaintenanceRequestItem[]

	// Selected request detail
	selectedRequest?: MaintenanceRequestDetail

	// Analytics
	analytics: MaintenanceAnalytics

	// Filters
	statusFilter: MaintenanceStatus | 'all'
	priorityFilter: MaintenancePriority | 'all'
	propertyFilter: string | 'all'

	// View mode
	viewMode: 'list' | 'kanban'

	// Callbacks
	onCreateRequest: (data: CreateRequestData) => void
	onUpdateStatus: (requestId: string, status: MaintenanceStatus) => void
	onUpdatePriority: (requestId: string, priority: MaintenancePriority) => void
	onAssignRequest: (requestId: string, assigneeId: string) => void
	onAddExpense: (requestId: string, expense: ExpenseData) => void
	onAddNotes: (requestId: string, notes: string) => void
	onUploadPhotos: (requestId: string, files: File[]) => void
	onScheduleWork: (requestId: string, date: string) => void
	onMarkComplete: (requestId: string, notes: string) => void
	onCancelRequest: (requestId: string) => void
	onExportRequests: (format: 'csv' | 'pdf') => void
	onViewRequest: (requestId: string) => void
	onStatusFilterChange: (status: MaintenanceStatus | 'all') => void
	onPriorityFilterChange: (priority: MaintenancePriority | 'all') => void
	onPropertyFilterChange: (propertyId: string | 'all') => void
	onViewModeChange: (mode: 'list' | 'kanban') => void
}

export interface MaintenanceRequestItem {
	id: string
	title: string
	description: string
	status: MaintenanceStatus
	priority: MaintenancePriority
	propertyName: string
	unitNumber: string
	tenantName?: string
	submittedBy: string
	assignedTo?: string
	scheduledDate?: string
	createdAt: string
	updatedAt: string
}

export interface MaintenanceRequestDetail extends MaintenanceRequestItem {
	propertyId: string
	unitId: string
	tenantId?: string
	requestedBy: string
	estimatedCost?: number
	actualCost?: number
	completedAt?: string
	inspectorId?: string
	inspectionDate?: string
	inspectionFindings?: string
	expenses: ExpenseItem[]
	photos: PhotoItem[]
	notes: NoteItem[]
	timeline: TimelineEvent[]
}

export interface ExpenseItem {
	id: string
	vendorName: string
	amount: number
	expenseDate: string
	description?: string
}

export interface PhotoItem {
	id: string
	imageUrl: string
	caption?: string
	uploadedAt: string
	type: 'before' | 'after' | 'progress'
}

export interface NoteItem {
	id: string
	content: string
	author: string
	createdAt: string
}

export interface TimelineEvent {
	id: string
	type: TimelineEventType
	title: string
	description?: string
	timestamp: string
	actor?: string
}

export interface MaintenanceAnalytics {
	openRequests: number
	inProgressRequests: number
	completedThisMonth: number
	averageResolutionDays: number
	totalCostThisMonth: number
	byPriority: PriorityBreakdown
	byProperty: PropertyBreakdown[]
	resolutionTrend: ResolutionTrend[]
}

export interface PriorityBreakdown {
	urgent: number
	high: number
	normal: number
	low: number
}

export interface PropertyBreakdown {
	propertyId: string
	propertyName: string
	openRequests: number
	totalCost: number
}

export interface ResolutionTrend {
	month: string
	opened: number
	completed: number
	averageDays: number
}

export interface CreateRequestData {
	title: string
	description: string
	priority: MaintenancePriority
	unitId: string
	scheduledDate?: string
}

export interface ExpenseData {
	vendorName: string
	amount: number
	expenseDate: string
	description?: string
}

// App-specific types (not database enums)
export type TimelineEventType =
	| 'created'
	| 'assigned'
	| 'status_change'
	| 'expense_added'
	| 'note_added'
	| 'photo_added'
	| 'scheduled'
	| 'completed'
