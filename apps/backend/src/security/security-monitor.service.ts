import { Injectable } from '@nestjs/common'
import { AppLogger } from '../logger/app-logger.service'

@Injectable()
export class SecurityMonitorService {
	constructor(private readonly logger: AppLogger) {}

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
