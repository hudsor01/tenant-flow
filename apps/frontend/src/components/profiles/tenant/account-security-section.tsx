'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Shield } from 'lucide-react'

interface AccountSecuritySectionProps {
	lastSignInAt: string | undefined
	onChangePassword: () => void
}

export function AccountSecuritySection({
	lastSignInAt,
	onChangePassword
}: AccountSecuritySectionProps) {
	return (
		<CardLayout
			title="Account Security"
			description="Manage your password and security settings"
		>
			<div className="space-y-4">
				<div className="flex-between p-4 border rounded-lg">
					<div className="flex items-center gap-3">
						<Shield className="size-5 text-accent-main" />
						<div>
							<p className="font-medium">Password</p>
							<p className="text-muted">
								Last changed:{' '}
								{lastSignInAt
									? new Date(lastSignInAt).toLocaleDateString()
									: 'Never'}
							</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={onChangePassword}>
						Change Password
					</Button>
				</div>
			</div>
		</CardLayout>
	)
}
