'use client'

import { cn } from '@/lib/design-system'
import type { AuthFormProps } from '@repo/shared/types/frontend'

export function SignupForm({
	className,
	onSubmit: _onSubmit,
	isLoading: _isLoading
}: Pick<AuthFormProps, 'className' | 'onSubmit' | 'isLoading'>) {
	// For this product tenants must be invited by an OWNER. The signup form
	// is intentionally disabled for tenant self-registration. We keep the
	// component shape so imports don't break, but render a clear message and
	// a CTA for owners or to request access.
	// Use the underscored props to avoid unused variable lint errors.
	void _onSubmit
	void _isLoading

	return (
		<div className={cn('w-full', className)}>
			<div className="p-6 bg-muted rounded-md">
				<h3 className="text-lg font-semibold">Invite-only access</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Tenant accounts are invite-only. If you are a tenant, please ask your
					property owner to invite you.
				</p>
				<p className="mt-2 text-sm">
					If you're an owner who needs to create an account for your property,
					please use the "Get Started" link on the pricing page or contact
					support.
				</p>
				<div className="mt-4 flex gap-2">
					<a
						href="/contact"
						className="btn btn-primary"
						data-testid="request-invite"
					>
						Request an invite
					</a>
					<a href="/pricing" className="btn btn-outline">
						Owner sign up
					</a>
				</div>
			</div>
		</div>
	)
}

export default SignupForm
