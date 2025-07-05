import type { ExecutionContext } from '@nestjs/common'
import {
	Injectable,
	UnauthorizedException,
	ForbiddenException
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Reflector } from '@nestjs/core'
import type { Observable } from 'rxjs'
import type { UserRole } from '../../types/auth'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private reflector: Reflector) {
		super()
	}

	override canActivate(
		context: ExecutionContext
	): boolean | Promise<boolean> | Observable<boolean> {
		return super.canActivate(context)
	}

	override handleRequest<TUser = unknown>(
		err: unknown,
		user: unknown,
		info: unknown,
		context: ExecutionContext
	): TUser {
		if (err || !user) {
			throw err || new UnauthorizedException('Invalid or expired token')
		}

		const validatedUser = user as { accountStatus: string; role: UserRole }

		// Check if user account is active
		if (validatedUser.accountStatus !== 'ACTIVE') {
			throw new ForbiddenException('Account is not active')
		}

		// Check role-based access
		const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
			'roles',
			[context.getHandler(), context.getClass()]
		)

		if (requiredRoles && !requiredRoles.includes(validatedUser.role)) {
			throw new ForbiddenException('Insufficient privileges')
		}

		return validatedUser as TUser
	}
}
