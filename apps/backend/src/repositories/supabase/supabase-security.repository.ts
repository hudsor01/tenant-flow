import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type {
	ISecurityRepository,
	SecurityAuditLogEntry,
	SecurityAuditQueryOptions
} from '../interfaces/security-repository.interface'

@Injectable()
export class SupabaseSecurityRepository implements ISecurityRepository {
	private readonly logger = new Logger(SupabaseSecurityRepository.name)

	constructor(private readonly supabase: SupabaseService) {}

	async fetchAuditLogs(
		options: SecurityAuditQueryOptions = {}
	): Promise<SecurityAuditLogEntry[]> {
		try {
			let query = this.supabase
				.getAdminClient()
				.from('security_audit_log')
				.select(
					'id, eventType, severity, userId, email, ipAddress, userAgent, resource, action, details, timestamp'
				)
				.order('timestamp', { ascending: false })

			const limit = options.limit ?? 500
			query = query.limit(limit)

			if (options.from) {
				query = query.gte('timestamp', options.from.toISOString())
			}

			if (options.to) {
				query = query.lte('timestamp', options.to.toISOString())
			}

			if (options.severity) {
				query = query.eq('severity', options.severity)
			}

			if (options.eventType) {
				query = query.eq('eventType', options.eventType)
			}

			const { data, error } = await query

			if (error) {
				this.logger.error('Failed to fetch security audit logs', {
					error: error.message,
					context: options
				})
				return []
			}

			return (data as SecurityAuditLogEntry[]) ?? []
		} catch (error) {
			this.logger.error(
				'Unexpected error while fetching security audit logs',
				error
			)
			return []
		}
	}
}
