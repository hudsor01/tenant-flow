import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SecurityMonitorService {
	private readonly logger = new Logger(SecurityMonitorService.name)

	logSecurityEvent(event: string, details: Record<string, unknown> = {}): void {
		this.logger.warn(`Security Event: ${event}`, details)
	}

	logFailedLogin(email: string, ip: string): void {
		this.logSecurityEvent('Failed Login', { email, ip })
	}

	logSuspiciousActivity(userId: string, activity: string): void {
		this.logSecurityEvent('Suspicious Activity', { userId, activity })
	}
}
