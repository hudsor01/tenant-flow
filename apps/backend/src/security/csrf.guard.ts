import {
	CanActivate,
	ExecutionContext,
	Injectable,
	SetMetadata
} from '@nestjs/common'

@Injectable()
export class CsrfGuard implements CanActivate {
	canActivate(_context: ExecutionContext): boolean {
		// For MVP, CSRF protection is minimal
		// In production, implement proper CSRF token validation
		return true
	}
}

// Decorator to exempt routes from CSRF protection
export const CSRF_EXEMPT_KEY = 'csrfExempt'
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true)
