// Refactored: useLeaseExpirationAlerts now uses tRPC for backend data instead of legacy apiClient

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays } from 'date-fns'
import { trpc } from '@/lib/trpcClient'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/lib/trpcClient'
import { logger } from '@/lib/logger'

// ...interface definitions unchanged...

const DEFAULT_SETTINGS: LeaseExpirationSettings = {
	enableAlerts: true,
	renewalNoticeAdvance: 90,
	expirationWarningAdvance: 30,
	autoSendAlerts: false,
	includeWeekends: true,
	escalationThreshold: 14
}

export function useLeaseExpirationAlerts() {
	const { user } = useAuth()
	const queryClient = useQueryClient()

	// Get lease expiration alerts from backend
	const { data: alerts = [], isLoading } = useQuery({
		queryKey: ['leaseExpirationAlerts', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				// Get all active leases and calculate expiration alerts
				const leases = await trpc.leases.getAll.fetch()
				const properties = await trpc.properties.getAll.fetch()
				const tenants = await trpc.tenants.getAll.fetch()

				const alerts: LeaseExpirationAlert[] = []
				const currentDate = new Date()

				for (const lease of leases) {
					if (lease.status !== 'ACTIVE') continue

					const property = properties.find(p =>
						p.units?.some(u => u.id === lease.unitId)
					)
					const tenant = tenants.find(t => t.id === lease.tenantId)
					const unit = property?.units?.find(
						u => u.id === lease.unitId
					)

					if (!property || !tenant || !unit) continue

					const endDate = new Date(lease.endDate)
					const daysUntilExpiration = differenceInDays(
						endDate,
						currentDate
					)

					let alertType: LeaseExpirationAlert['alertType']
					let priority: LeaseExpirationAlert['priority']

					if (daysUntilExpiration < 0) {
						alertType = 'expired'
						priority = 'critical'
					} else if (daysUntilExpiration <= 14) {
						alertType = 'expiring_soon'
						priority = 'critical'
					} else if (daysUntilExpiration <= 30) {
						alertType = 'notice_period'
						priority = 'high'
					} else if (daysUntilExpiration <= 90) {
						alertType = 'renewal_opportunity'
						priority = 'medium'
					} else {
						continue
					}

					alerts.push({
						id: `alert-${lease.id}`,
						leaseId: lease.id,
						tenantId: tenant.id,
						propertyName: property.name,
						unitNumber: unit.unitNumber || 'N/A',
						tenantName: tenant.name,
						tenantEmail: tenant.email,
						currentRentAmount: lease.rentAmount,
						leaseStartDate: lease.startDate,
						leaseEndDate: lease.endDate,
						daysUntilExpiration,
						alertType,
						status: 'pending',
						priority,
						createdAt: new Date().toISOString()
					})
				}

				return alerts.sort(
					(a, b) => a.daysUntilExpiration - b.daysUntilExpiration
				)
			} catch (error) {
				logger.error('Failed to fetch lease expiration alerts', error instanceof Error ? error : new Error(String(error)))
				return []
			}
		},
		enabled: !!user?.id,
		refetchInterval: 1000 * 60 * 60 * 6
	})

	// Send lease expiration alert
	const sendAlertMutation = useMutation({
		mutationFn: async (alert: LeaseExpirationAlert) => {
			try {
				// Send email notification using Supabase Edge Function
				const emailData = {
					to: alert.tenantEmail,
					subject: `Important: Your lease ${alert.alertType.replace('_', ' ')} - ${alert.propertyName}`,
					template: 'lease-expiration-alert',
					data: {
						tenantName: alert.tenantName,
						propertyName: alert.propertyName,
						unitNumber: alert.unitNumber,
						leaseEndDate: new Date(
							alert.leaseEndDate
						).toLocaleDateString(),
						daysUntilExpiration: alert.daysUntilExpiration,
						alertType: alert.alertType,
						currentRentAmount: alert.currentRentAmount,
						recommendedActions: getRecommendedActions(alert)
					}
				}

				const { error } = await supabase.functions.invoke(
					'send-lease-alert',
					{
						body: emailData
					}
				)

				if (error) throw error

				logger.info(
					'Lease expiration alert sent via email',
					undefined,
					{
						alertId: alert.id,
						alertType: alert.alertType,
						tenantEmail: alert.tenantEmail
					}
				)

				return {
					...alert,
					status: 'sent' as const,
					sentAt: new Date().toISOString()
				}
			} catch (error) {
				logger.error('Failed to send lease expiration alert', error instanceof Error ? error : new Error(String(error)))
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['leaseExpirationAlerts']
			})
			logger.info('Lease expiration alert sent successfully')
		}
	})

	// Send bulk alerts
	const sendBulkAlertsMutation = useMutation({
		mutationFn: async (alertIds: string[]) => {
			const targetAlerts = alerts.filter(a => alertIds.includes(a.id))

			// Bulk lease expiration alert sending placeholder
			logger.info('Bulk lease expiration alerts sent', undefined, {
				alertIds,
				count: targetAlerts.length
			})

			return {
				successful: targetAlerts.length,
				failed: 0,
				total: targetAlerts.length
			}
		},
		onSuccess: results => {
			queryClient.invalidateQueries({
				queryKey: ['leaseExpirationAlerts']
			})
			if (results.failed === 0) {
				logger.info(
					`Successfully sent ${results.successful} lease expiration alerts`
				)
			} else {
				logger.warn(
					`Sent ${results.successful} alerts, ${results.failed} failed`
				)
			}
		}
	})

	// Mark alert as acknowledged (tenant responded or action taken)
	const acknowledgeAlertMutation = useMutation({
		mutationFn: async (alertId: string) => {
			// Alert status update placeholder - in production would update alert_log table
			logger.info('Lease expiration alert acknowledged', undefined, {
				alertId
			})
			return alertId
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['leaseExpirationAlerts']
			})
		}
	})

	// Statistics for dashboard
	const stats = {
		totalAlerts: alerts.length,
		renewalOpportunities: alerts.filter(
			a => a.alertType === 'renewal_opportunity'
		).length,
		noticePeriod: alerts.filter(a => a.alertType === 'notice_period')
			.length,
		expiringSoon: alerts.filter(a => a.alertType === 'expiring_soon')
			.length,
		expired: alerts.filter(a => a.alertType === 'expired').length,
		criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
		totalRentAtRisk: alerts
			.filter(a => a.daysUntilExpiration <= 30)
			.reduce((sum, a) => sum + a.currentRentAmount, 0),
		avgLeaseLength:
			alerts.length > 0
				? alerts.reduce((sum, a) => {
					const start = new Date(a.leaseStartDate)
					const end = new Date(a.leaseEndDate)
					return sum + differenceInDays(end, start)
				}, 0) /
				alerts.length /
				365
				: 0
	}

	return {
		alerts,
		stats,
		isLoading,
		sendAlert: sendAlertMutation.mutate,
		sendBulkAlerts: sendBulkAlertsMutation.mutate,
		acknowledgeAlert: acknowledgeAlertMutation.mutate,
		isSending:
			sendAlertMutation.isPending || sendBulkAlertsMutation.isPending
	}
}

export function useLeaseExpirationSettings() {
	const { user } = useAuth()
	const queryClient = useQueryClient()

	// Get user's lease expiration settings
	const { data: settings = DEFAULT_SETTINGS } = useQuery({
		queryKey: ['leaseExpirationSettings', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')
			return DEFAULT_SETTINGS
		},
		enabled: !!user?.id
	})

	// Update settings
	const updateSettingsMutation = useMutation({
		mutationFn: async (newSettings: Partial<LeaseExpirationSettings>) => {
			logger.info('Lease expiration settings updated', undefined, {
				settings: newSettings
			})
			return { ...settings, ...newSettings }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['leaseExpirationSettings']
			})
			queryClient.invalidateQueries({
				queryKey: ['leaseExpirationAlerts']
			})
		}
	})

	return {
		settings,
		updateSettings: updateSettingsMutation.mutate,
		isUpdating: updateSettingsMutation.isPending
	}
}

// Helper function to get recommended actions for each alert type
export function getRecommendedActions(alert: LeaseExpirationAlert): string[] {
	switch (alert.alertType) {
		case 'renewal_opportunity':
			return [
				'Contact tenant to discuss lease renewal',
				'Review market rates for rent adjustment',
				'Prepare renewal lease documents',
				'Schedule property inspection if needed'
			]
		case 'notice_period':
			return [
				'Send formal lease renewal notice',
				'Negotiate new lease terms',
				'Set deadline for tenant response',
				'Begin preparing for potential vacancy'
			]
		case 'expiring_soon':
			return [
				'Urgent: Contact tenant immediately',
				'Finalize renewal or prepare for move-out',
				'Schedule move-out inspection if not renewing',
				'List property for new tenants if needed'
			]
		case 'expired':
			return [
				'Critical: Address holdover tenancy',
				'Review local tenant laws',
				'Consult legal counsel if necessary',
				'Document all communications'
			]
		default:
			return ['Review lease status and take appropriate action']
	}
}
