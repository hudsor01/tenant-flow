import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SecurityMonitorService {
	private readonly logger = new Logger(SecurityMonitorService.name)

	logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
		this.logger.warn(`Security Event: ${event}`, details)
	}

	logFailedLogin(email: string, ip: string) {
		this.logSecurityEvent('Failed Login', { email, ip })
	}

	logSuspiciousActivity(userId: string, activity: string) {
		this.logSecurityEvent('Suspicious Activity', { userId, activity })
	}
}
