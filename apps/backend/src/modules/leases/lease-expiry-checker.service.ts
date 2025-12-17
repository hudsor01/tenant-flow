import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { LeaseExpiringEvent } from '../notifications/events/notification.events'
import { calculateDaysUntilExpiry } from '@repo/shared/utils/lease-expiry-calculator'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Lease Expiry Checker Service
 * 
 * Provides a daily safety net check for lease expiry notifications.
 * While notifications are primarily created when leases are created/updated,
 * this scheduler handles edge cases where leases created 100+ days before expiry
 * might not have been in notification windows at creation time.
 * 
 * Idempotency: The LeaseExpiryNotificationListener checks for existing notifications
 * before creating new ones, preventing duplicates.
 */
@Injectable()
export class LeaseExpiryCheckerService {

	constructor(private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2, private readonly logger: AppLogger) {}

	/**
	 * Daily safety net: Check for leases entering notification windows
	 * Runs at 9:00 AM daily (UTC)
	 * 
	 * Only emits events for leases within 95-25 day windows.
	 * Events are idempotently handled by LeaseExpiryNotificationListener.
	 */
	@Cron(CronExpression.EVERY_DAY_AT_9AM)
	async checkLeaseExpiries(): Promise<void> {
		const startTime = Date.now()
		
		try {
			this.logger.log('Starting daily lease expiry check')

			const adminClient = this.supabase.getAdminClient()

			// Query leases expiring within 95 days
			// Note: leases -> units -> properties (not direct leases -> properties)
			// Tenant name comes from users table via tenants.user_id
			const { data, error } = await adminClient
				.from('leases')
				.select(
					'id, end_date, lease_status, unit_id, ' +
					'tenant:tenants!primary_tenant_id(id, user_id, users(full_name)), ' +
					'unit:units!unit_id(id, unit_number, property_id, property:properties(id, name, owner_user_id))'
				)
				.eq('lease_status', 'active')
				.not('end_date', 'is', null)
				.gte('end_date', new Date().toISOString())

			if (error) {
				this.logger.error('Database query failed', {
					message: error.message,
					code: error.code
				})
				return
			}

			const leases = ((data as unknown) ?? []) as Array<{
				id: string
				end_date: string
				lease_status: string
				unit_id: string
				tenant?: { id: string; user_id: string; users?: { full_name: string | null } }
				unit?: {
					id: string
					unit_number: string
					property_id: string
					property?: { id: string; name: string; owner_user_id: string }
				}
			}>

			if (leases.length === 0) {
				this.logger.log('No active leases found')
				return
			}

			// Process leases and emit events for those in notification windows
			let emittedCount = 0

			for (const lease of leases) {
				const daysUntilExpiry = calculateDaysUntilExpiry(lease.end_date)

				// Only emit if in notification window (25-95 days)
				if (daysUntilExpiry >= 25 && daysUntilExpiry < 95) {
					// Property is now nested under unit (leases -> units -> properties)
					const property = lease.unit?.property

					// Validate property and owner_user_id exist before processing
					if (!property || !property.owner_user_id) {
						this.logger.warn('Skipping lease expiring event: missing property or owner_user_id', {
							lease_id: lease.id,
							property_id: property?.id,
							tenant_id: lease.tenant?.id
						})
						continue
					}

					const event = new LeaseExpiringEvent(
						property.owner_user_id,
						lease.tenant?.users?.full_name ?? 'Unknown Tenant',
						property.name ?? 'Unknown Property',
						lease.unit?.unit_number ?? 'Unknown Unit',
						lease.end_date,
						daysUntilExpiry
					)

					// Emit event - listener handles idempotency
					await this.eventEmitter.emitAsync('lease.expiring', event)
					emittedCount++
				}
			}

			const duration = Date.now() - startTime
			this.logger.log('Daily lease expiry check completed', {
				totalLeases: leases.length,
				emittedEvents: emittedCount,
				durationMs: duration
			})
		} catch (error) {
			this.logger.error('Lease expiry check failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})
		}
	}
}