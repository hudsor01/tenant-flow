import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SecurityMonitorService {
	private readonly logger = new Logger(SecurityMonitorService.name)

	logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
		this.logger.warn(
			{
				security: {
					event,
					...details,
					timestamp: new Date().toISOString()
				}
			},
			`Security Event: ${event}`
		)
	}

	logFailedLogin(email: string, ip: string) {
		this.logSecurityEvent('Failed Login', { email, ip })
	}

	logSuspiciousActivity(user_id: string, activity: string) {
		this.logSecurityEvent('Suspicious Activity', { user_id, activity })
	}
}
