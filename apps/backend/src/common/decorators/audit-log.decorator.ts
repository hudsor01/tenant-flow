import { Injectable, Logger, SetMetadata } from '@nestjs/common'
import { SecurityEventType } from '@repo/shared'

export interface AuditLogOptions {
	action: string
	entity?: string
	sensitive?: boolean
	eventType?: SecurityEventType
	includeResult?: boolean
	extractUserId?: (args: unknown[]) => string
}

export const AUDIT_LOG_KEY = 'audit_log'

// Enhanced audit decorator with automatic logging
export const AuditLog = (options: AuditLogOptions) => {
	return function (
		target: object,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value
		const logger = new Logger(`${target.constructor.name}.${propertyName}`)

		descriptor.value = async function (...args: unknown[]) {
			const startTime = Date.now()
			let result: unknown
			let error: Error | null = null

			try {
				result = await originalMethod.apply(this, args)
				return result
			} catch (err) {
				error = err as Error
				throw err
			} finally {
				try {
					const executionTime = Date.now() - startTime

					// Extract userId using custom function or default pattern
					const userId = options.extractUserId
						? options.extractUserId(args)
						: args.find(
								(arg): arg is string =>
									typeof arg === 'string' &&
									(!!arg.match(/^[0-9a-f-]{36}$/i) ||
										arg.includes('user-') ||
										arg.includes('org-'))
							) || 'system'

					const auditData = {
						method: propertyName,
						action: options.action,
						entity: options.entity || 'unknown',
						executionTime,
						success: !error,
						timestamp: new Date().toISOString(),
						userId: String(userId),
						...(error && {
							error: error.message,
							errorType: error.constructor.name
						}),
						...(options.includeResult &&
						result &&
						typeof result === 'object' &&
						'id' in result
							? { entityId: (result as { id: unknown }).id }
							: {}),
						...(options.includeResult &&
						result &&
						typeof result === 'object' &&
						'name' in result
							? { entityName: (result as { name: unknown }).name }
							: {})
					}

					// Log to audit service if available
					if ('auditService' in target && target.auditService) {
						await (
							target as {
								auditService: {
									logSecurityEvent: (
										data: unknown
									) => Promise<void>
								}
							}
						).auditService.logSecurityEvent({
							eventType:
								options.eventType ||
								SecurityEventType.PII_ACCESS,
							userId: String(userId),
							resource: options.entity || 'unknown',
							action: options.action,
							details: JSON.stringify(auditData)
						})
					}

					// Log for immediate visibility
					const logLevel = error ? 'warn' : 'log'
					logger[logLevel](
						`Audit: ${options.action} ${options.entity}`,
						{
							userId,
							success: !error,
							executionTime,
							sensitive: options.sensitive
						}
					)
				} catch (auditError) {
					logger.error('Audit logging failed', auditError)
				}
			}
		}

		// Also set metadata for interceptors
		SetMetadata(AUDIT_LOG_KEY, options)(target, propertyName, descriptor)
		return descriptor
	}
}

// Simple metadata-only decorator for backward compatibility
export const AuditLogMeta = (options: AuditLogOptions) =>
	SetMetadata(AUDIT_LOG_KEY, options)

/**
 * Injectable service for manual audit logging
 */
@Injectable()
export class AuditLogger {
	private readonly logger = new Logger(AuditLogger.name)

	async logSecurityEvent(
		eventType: SecurityEventType,
		userId: string,
		resource: string,
		action: string,
		details: Record<string, unknown>,
		auditService?: {
			createSecurityAudit?: (data: unknown) => Promise<void>
			logSecurityEvent?: (data: unknown) => Promise<void>
		}
	): Promise<void> {
		const auditEvent = {
			eventType,
			userId: String(userId),
			resource,
			action,
			details: JSON.stringify({
				...details,
				timestamp: new Date().toISOString()
			})
		}

		try {
			if (auditService?.logSecurityEvent) {
				await auditService.logSecurityEvent(auditEvent)
			} else if (auditService?.createSecurityAudit) {
				await auditService.createSecurityAudit(auditEvent)
			}

			this.logger.log(`Manual audit: ${action} ${resource}`, {
				userId,
				...details
			})
		} catch (error) {
			this.logger.error('Manual audit logging failed', error)
		}
	}
}
