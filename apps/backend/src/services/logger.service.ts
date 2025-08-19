import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class LoggerService {
	logSecurity(
		_eventType: string,
		_arg1: {
			ipAddress: string
			userAgent: string
			severity: string
			userId: string | undefined
			tenantId: string | undefined
			endpoint: string
			method: string
		}
	) {
		throw new Error('Method not implemented.')
	}
	private readonly logger = new Logger('TenantFlow')
	setContext: (context: string) => void = () => {}

	log(message: string, context?: string) {
		this.logger.log(message, context)
	}

	error(message: string, trace?: string, context?: string) {
		this.logger.error(message, trace, context)
	}

	warn(message: string, context?: string) {
		this.logger.warn(message, context)
	}

	debug(message: string, context?: string) {
		this.logger.debug(message, context)
	}

	verbose(message: string, context?: string) {
		this.logger.verbose(message, context)
	}
}
