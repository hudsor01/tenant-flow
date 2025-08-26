import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class UsageLimitsGuard implements CanActivate {
<<<<<<< HEAD
=======
	constructor() {}

>>>>>>> origin/main
	canActivate(_context: ExecutionContext): boolean {
		// For MVP, always allow access
		// In production, this would check subscription limits
		return true
	}
}
