import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UsageLimitsGuard implements CanActivate {
	private readonly logger = new Logger(UsageLimitsGuard.name)

	canActivate(_context: ExecutionContext): boolean {
		// For MVP, always allow access
		// In production, this would check subscription limits
		this.logger.debug('Usage limits check bypassed (MVP mode)')
		return true
	}
}
