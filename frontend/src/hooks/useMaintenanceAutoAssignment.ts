import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { MaintenanceRequest } from '@/types/entities'

interface Contractor {
	id: string
	name: string
	email: string
	phone: string
	specialties: string[]
	rating: number
	availability: 'available' | 'busy' | 'unavailable'
	responseTimeHours: number
	hourlyRate: number
	maxConcurrentJobs: number
	currentJobs: number
	lastAssignedAt?: string
	createdAt: string
}

interface AutoAssignmentRule {
	id: string
	issueType: string
	priority: 'low' | 'medium' | 'high' | 'emergency'
	preferredContractors: string[]
	maxResponseTime: number // hours
	autoAssign: boolean
	requiresApproval: boolean
	budgetLimit?: number
}

interface AssignmentRecommendation {
	contractorId: string
	contractor: Contractor
	score: number
	reasons: string[]
	estimatedResponseTime: number
	estimatedCost: number
}

// MaintenanceAssignment interface - future enhancement for tracking assignments
// interface MaintenanceAssignment {
//   id: string;
//   requestId: string;
//   contractorId: string;
//   contractor: Contractor;
//   assignedAt: string;
//   status: 'pending' | 'accepted' | 'declined' | 'completed';
//   estimatedResponseTime: number;
//   estimatedCost: number;
//   actualResponseTime?: number;
//   actualCost?: number;
//   notes?: string;
// }

const DEFAULT_ASSIGNMENT_RULES: AutoAssignmentRule[] = [
	{
		id: 'plumbing',
		issueType: 'plumbing',
		priority: 'high',
		preferredContractors: [],
		maxResponseTime: 4,
		autoAssign: true,
		requiresApproval: false
	},
	{
		id: 'electrical',
		issueType: 'electrical',
		priority: 'high',
		preferredContractors: [],
		maxResponseTime: 2,
		autoAssign: false,
		requiresApproval: true
	},
	{
		id: 'hvac',
		issueType: 'hvac',
		priority: 'medium',
		preferredContractors: [],
		maxResponseTime: 8,
		autoAssign: true,
		requiresApproval: false
	},
	{
		id: 'general',
		issueType: 'general',
		priority: 'low',
		preferredContractors: [],
		maxResponseTime: 24,
		autoAssign: false,
		requiresApproval: false
	}
]

export function useMaintenanceAutoAssignment() {
	const { user } = useAuthStore()
	const queryClient = useQueryClient()

	// Get all contractors
	const { data: contractors = [], isLoading: isLoadingContractors } =
		useQuery({
			queryKey: ['contractors', user?.id],
			queryFn: async () => {
				if (!user?.id) throw new Error('No user ID')

				try {
					// Query contractors from Supabase
					const { data, error } = await supabase
						.from('contractors')
						.select('*')
						.eq('ownerId', user.id)
						.order('rating', { ascending: false })

					if (error) throw error

					const contractorsData: Contractor[] =
						data?.map(contractor => ({
							id: contractor.id,
							name: contractor.name,
							email: contractor.email,
							phone: contractor.phone || '',
							specialties: contractor.specialties || [],
							rating: contractor.rating || 4.0,
							availability:
								contractor.availability || 'available',
							responseTimeHours:
								contractor.response_time_hours || 24,
							hourlyRate: contractor.hourly_rate || 75,
							maxConcurrentJobs:
								contractor.max_concurrent_jobs || 5,
							currentJobs: contractor.current_jobs || 0,
							lastAssignedAt: contractor.last_assigned_at,
							createdAt: contractor.created_at
						})) || []

					return contractorsData
				} catch (error) {
					logger.error('Failed to fetch contractors', error)
					return []
				}
			},
			enabled: !!user?.id
		})

	// Get pending maintenance requests that need assignment
	const { data: pendingRequests = [], isLoading: isLoadingRequests } =
		useQuery({
			queryKey: ['pendingMaintenanceRequests', user?.id],
			queryFn: async () => {
				if (!user?.id) throw new Error('No user ID')

				// Use existing maintenance API with pending status filter
				const requests = await apiClient.maintenance.getAll({
					status: 'PENDING'
				})

				// Filter for unassigned requests (no contractor assigned)
				return requests.filter(request => !request.assignedContractorId)
			},
			enabled: !!user?.id
		})

	// Get assignment rules
	const { data: assignmentRules = DEFAULT_ASSIGNMENT_RULES } = useQuery({
		queryKey: ['assignmentRules', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Settings placeholder - in production would fetch from user_settings table
			return DEFAULT_ASSIGNMENT_RULES
		},
		enabled: !!user?.id
	})

	// Calculate contractor score for a specific request
	const calculateContractorScore = (
		contractor: Contractor,
		request: MaintenanceRequest
	): number => {
		let score = 0

		// Base score from rating (0-100)
		score += contractor.rating * 20

		// Specialty match bonus (0-30)
		const requestType = request.category?.toLowerCase() || 'general'
		if (
			contractor.specialties.some(s =>
				s.toLowerCase().includes(requestType)
			)
		) {
			score += 30
		}

		// Availability bonus (0-20)
		if (contractor.availability === 'available') {
			score += 20
		} else if (contractor.availability === 'busy') {
			score += 10
		}

		// Workload penalty (0 to -15)
		const workloadRatio =
			contractor.currentJobs / contractor.maxConcurrentJobs
		score -= workloadRatio * 15

		// Response time bonus (0-15)
		if (contractor.responseTimeHours <= 2) {
			score += 15
		} else if (contractor.responseTimeHours <= 4) {
			score += 10
		} else if (contractor.responseTimeHours <= 8) {
			score += 5
		}

		// Recent assignment penalty (0 to -10)
		if (contractor.lastAssignedAt) {
			const daysSinceLastAssignment =
				(Date.now() - new Date(contractor.lastAssignedAt).getTime()) /
				(1000 * 60 * 60 * 24)
			if (daysSinceLastAssignment < 1) {
				score -= 10
			} else if (daysSinceLastAssignment < 3) {
				score -= 5
			}
		}

		return Math.max(0, Math.min(100, score))
	}

	// Get assignment recommendations for a request
	const getAssignmentRecommendations = (
		request: MaintenanceRequest
	): AssignmentRecommendation[] => {
		return contractors
			.map(contractor => {
				const score = calculateContractorScore(contractor, request)
				const reasons: string[] = []

				// Add scoring reasons
				if (contractor.rating >= 4.5) reasons.push('Excellent rating')
				if (contractor.availability === 'available')
					reasons.push('Currently available')
				if (contractor.responseTimeHours <= 4)
					reasons.push('Fast response time')

				const requestType = request.category?.toLowerCase() || 'general'
				if (
					contractor.specialties.some(s =>
						s.toLowerCase().includes(requestType)
					)
				) {
					reasons.push(`Specializes in ${requestType}`)
				}

				return {
					contractorId: contractor.id,
					contractor,
					score,
					reasons,
					estimatedResponseTime: contractor.responseTimeHours,
					estimatedCost: contractor.hourlyRate * 2 // Rough estimate
				}
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 5) // Top 5 recommendations
	}

	// Auto-assign contractor to request
	const autoAssignMutation = useMutation({
		mutationFn: async ({
			requestId,
			contractorId
		}: {
			requestId: string
			contractorId: string
		}) => {
			const contractor = contractors.find(c => c.id === contractorId)
			if (!contractor) throw new Error('Contractor not found')

			try {
				// Update maintenance request with assigned contractor
				await apiClient.maintenance.update(requestId, {
					status: 'IN_PROGRESS',
					assignedContractorId: contractorId
				})

				// Update contractor's current job count and last assigned date
				const { error: contractorError } = await supabase
					.from('contractors')
					.update({
						current_jobs: contractor.currentJobs + 1,
						last_assigned_at: new Date().toISOString()
					})
					.eq('id', contractorId)

				if (contractorError) {
					logger.warn(
						'Failed to update contractor assignment stats',
						contractorError
					)
				}

				// Send assignment notification to contractor
				const { error: emailError } = await supabase.functions.invoke(
					'send-contractor-assignment',
					{
						body: {
							contractorEmail: contractor.email,
							contractorName: contractor.name,
							requestId,
							estimatedCost: contractor.hourlyRate * 2,
							responseTimeHours: contractor.responseTimeHours
						}
					}
				)

				if (emailError) {
					logger.warn(
						'Failed to send contractor assignment email',
						emailError
					)
				}

				logger.info('Maintenance request assigned to contractor', {
					requestId,
					contractorId
				})

				return { requestId, contractorId, contractor }
			} catch (error) {
				logger.error('Failed to auto-assign maintenance request', error)
				throw error
			}
		},
		onSuccess: data => {
			queryClient.invalidateQueries({
				queryKey: ['pendingMaintenanceRequests']
			})
			queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] })
			queryClient.invalidateQueries({ queryKey: ['contractors'] })
			logger.info(
				'Maintenance request auto-assigned successfully',
				undefined,
				{
					requestId: data.requestId,
					contractorId: data.contractorId
				}
			)
		}
	})

	// Bulk auto-assign multiple requests
	const bulkAutoAssignMutation = useMutation({
		mutationFn: async (requestIds: string[]) => {
			const results = await Promise.allSettled(
				requestIds.map(async requestId => {
					const request = pendingRequests.find(
						r => r.id === requestId
					)
					if (!request)
						throw new Error(`Request ${requestId} not found`)

					const recommendations =
						getAssignmentRecommendations(request)
					if (recommendations.length === 0)
						throw new Error('No suitable contractors found')

					const bestContractor = recommendations[0]
					await autoAssignMutation.mutateAsync({
						requestId,
						contractorId: bestContractor.contractorId
					})

					return {
						requestId,
						contractorId: bestContractor.contractorId
					}
				})
			)

			const successful = results.filter(
				r => r.status === 'fulfilled'
			).length
			const failed = results.filter(r => r.status === 'rejected').length

			return { successful, failed, total: requestIds.length }
		},
		onSuccess: results => {
			if (results.failed === 0) {
				logger.info(
					`Successfully auto-assigned ${results.successful} maintenance requests`
				)
			} else {
				logger.warn(
					`Auto-assigned ${results.successful} requests, ${results.failed} failed`
				)
			}
		}
	})

	// Statistics
	const stats = {
		totalPendingRequests: pendingRequests.length,
		availableContractors: contractors.filter(
			c => c.availability === 'available'
		).length,
		busyContractors: contractors.filter(c => c.availability === 'busy')
			.length,
		avgContractorRating:
			contractors.length > 0
				? contractors.reduce((sum, c) => sum + c.rating, 0) /
					contractors.length
				: 0,
		avgResponseTime:
			contractors.length > 0
				? contractors.reduce((sum, c) => sum + c.responseTimeHours, 0) /
					contractors.length
				: 0,
		emergencyRequests: pendingRequests.filter(
			r => r.priority === 'EMERGENCY'
		).length,
		highPriorityRequests: pendingRequests.filter(r => r.priority === 'HIGH')
			.length
	}

	return {
		contractors,
		pendingRequests,
		assignmentRules,
		stats,
		isLoading: isLoadingContractors || isLoadingRequests,
		getAssignmentRecommendations,
		autoAssign: autoAssignMutation.mutate,
		bulkAutoAssign: bulkAutoAssignMutation.mutate,
		isAssigning:
			autoAssignMutation.isPending || bulkAutoAssignMutation.isPending
	}
}

export function useContractorManagement() {
	const { user } = useAuthStore()
	const queryClient = useQueryClient()

	// Add new contractor
	const addContractorMutation = useMutation({
		mutationFn: async (
			contractorData: Omit<Contractor, 'id' | 'createdAt'>
		) => {
			if (!user?.id) throw new Error('No user ID')

			try {
				const { data, error } = await supabase
					.from('contractors')
					.insert({
						owner_id: user.id,
						name: contractorData.name,
						email: contractorData.email,
						phone: contractorData.phone,
						specialties: contractorData.specialties,
						rating: contractorData.rating,
						availability: contractorData.availability,
						response_time_hours: contractorData.responseTimeHours,
						hourly_rate: contractorData.hourlyRate,
						max_concurrent_jobs: contractorData.maxConcurrentJobs,
						current_jobs: 0
					})
					.select()
					.single()

				if (error) throw error

				logger.info('Contractor added successfully', undefined, {
					contractorId: data.id,
					name: contractorData.name
				})

				return data
			} catch (error) {
				logger.error('Failed to add contractor', error)
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['contractors'] })
			logger.info('Contractor added successfully')
		}
	})

	// Update contractor
	const updateContractorMutation = useMutation({
		mutationFn: async ({
			id,
			updates
		}: {
			id: string
			updates: Partial<Contractor>
		}) => {
			try {
				const updateData: Partial<Contractor> = {}

				if (updates.name) updateData.name = updates.name
				if (updates.email) updateData.email = updates.email
				if (updates.phone) updateData.phone = updates.phone
				if (updates.specialties)
					updateData.specialties = updates.specialties
				if (updates.rating) updateData.rating = updates.rating
				if (updates.availability)
					updateData.availability = updates.availability
				if (updates.responseTimeHours)
					updateData.response_time_hours = updates.responseTimeHours
				if (updates.hourlyRate)
					updateData.hourly_rate = updates.hourlyRate
				if (updates.maxConcurrentJobs)
					updateData.max_concurrent_jobs = updates.maxConcurrentJobs
				if (updates.currentJobs !== undefined)
					updateData.current_jobs = updates.currentJobs

				const { data, error } = await supabase
					.from('contractors')
					.update(updateData)
					.eq('id', id)
					.select()
					.single()

				if (error) throw error

				logger.info('Contractor updated successfully', undefined, {
					contractorId: id,
					updates: Object.keys(updateData)
				})

				return data
			} catch (error) {
				logger.error('Failed to update contractor', error)
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['contractors'] })
			logger.info('Contractor updated successfully')
		}
	})

	return {
		addContractor: addContractorMutation.mutate,
		updateContractor: updateContractorMutation.mutate,
		isAddingContractor: addContractorMutation.isPending,
		isUpdatingContractor: updateContractorMutation.isPending
	}
}
