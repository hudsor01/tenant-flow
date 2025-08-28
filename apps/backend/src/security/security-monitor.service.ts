import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

@Injectable()
export class SecurityMonitorService {
	constructor(private readonly logger: PinoLogger) {
		// PinoLogger context handled automatically via app-level configuration
	}

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

	logSuspiciousActivity(userId: string, activity: string) {
		this.logSecurityEvent('Suspicious Activity', { userId, activity })
	}
}
