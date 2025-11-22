import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

/**
 * Simple guard that checks user_type from JWT claims
 * Supabase already validated the JWT, we just check the claim
 * RLS handles actual data access at the database level
 */
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
			context.getHandler(), 
			context.getClass()
		])
		
		if (!requiredRoles) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const userType = request.user?.app_metadata?.user_type
		
		if (!userType || !requiredRoles.includes(userType)) {
			throw new ForbiddenException('Insufficient permissions')
		}

		return true
	}
}