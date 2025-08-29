import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger/logger'
import { toast } from 'sonner'
import type { UseFormReturn } from 'react-hook-form'
import type { PasswordFormData } from '@repo/shared/types/frontend'

interface SecurityTabSectionProps {
	form: UseFormReturn<PasswordFormData>
	onSubmit: (data: PasswordFormData) => Promise<void>
	onCancel: () => void
}

/**
 * Security tab section component for profile editing
 * Handles password change functionality
 */
export function SecurityTabSection({
	form,
	onSubmit,
	onCancel
}: SecurityTabSectionProps) {
	return (
		<form
			onSubmit={e => {
				void form
					.handleSubmit(onSubmit)(e)
					.catch(error => {
						logger.error(
							'Failed to update password:',
							error instanceof Error
								? error
								: new Error(String(error)),
							{ component: 'SecurityTabSection' }
						)
						toast.error('Failed to update password')
					})
			}}
			className="space-y-6"
		>
			{/* Security Information */}
			<div className="rounded-lg border border-blue-2 bg-blue-50 p-4">
				<div className="flex items-start space-x-3">
					<i className="i-lucide-shield text-primary mt-0.5 h-5 w-5"  />
					<div className="text-sm">
						<p className="mb-1 font-medium text-blue-9">
							Password Security
						</p>
						<p className="text-blue-7">
							Choose a strong password with at least 6 characters.
							A good password includes a mix of letters, numbers,
							and symbols.
						</p>
					</div>
				</div>
			</div>

			{/* Password Fields */}
			<div className="space-y-4">
				{/* Current Password */}
				<div className="space-y-2">
					<Label
						htmlFor="currentPass"
						className="text-sm font-medium text-gray-7"
					>
						Current Password *
					</Label>
					<div className="relative">
						<i className="i-lucide-lock absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-4"  />
						<Input
							id="currentPass"
							type="password"
							placeholder="Enter your current password"
							className="focus:border-primary pl-10 transition-colors"
							autoComplete="current-password"
							{...form.register('currentPassword')}
						/>
					</div>
					{form.formState.errors.currentPassword && (
						<p className="text-sm text-red-6">
							{form.formState.errors.currentPassword.message}
						</p>
					)}
				</div>

				{/* New Password */}
				<div className="space-y-2">
					<Label
						htmlFor="newPassword"
						className="text-sm font-medium text-gray-7"
					>
						New Password *
					</Label>
					<div className="relative">
						<i className="i-lucide-lock absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-4"  />
						<Input
							id="newPassword"
							type="password"
							placeholder="Enter your new password"
							className="focus:border-primary pl-10 transition-colors"
							autoComplete="new-password"
							{...form.register('newPassword')}
						/>
					</div>
					{form.formState.errors.newPassword && (
						<p className="text-sm text-red-6">
							{form.formState.errors.newPassword.message}
						</p>
					)}
				</div>

				{/* Confirm New Password */}
				<div className="space-y-2">
					<Label
						htmlFor="confirmPass"
						className="text-sm font-medium text-gray-7"
					>
						Confirm New Password *
					</Label>
					<div className="relative">
						<i className="i-lucide-lock absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-4"  />
						<Input
							id="confirmPass"
							type="password"
							placeholder="Confirm your new password"
							className="focus:border-primary pl-10 transition-colors"
							autoComplete="new-password"
							{...form.register('confirmPassword')}
						/>
					</div>
					{form.formState.errors.confirmPassword && (
						<p className="text-sm text-red-6">
							{form.formState.errors.confirmPassword.message}
						</p>
					)}
				</div>
			</div>

			{/* Security Warning */}
			<div className="rounded-lg border border-amber-2 bg-amber-1 p-4">
				<div className="flex items-start space-x-3">
					<i className="i-lucide-alert-circle mt-0.5 h-5 w-5 text-amber-6"  />
					<div className="text-sm">
						<p className="mb-1 font-medium text-amber-9">
							Important Security Note
						</p>
						<p className="text-amber-7">
							Changing your password will sign you out of all
							devices. You&apos;ll need to sign in again with your
							new password.
						</p>
					</div>
				</div>
			</div>

			{/* Form Actions */}
			<div className="flex justify-end space-x-3 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={form.formState.isSubmitting}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={form.formState.isSubmitting}
					className="bg-red-6 hover:bg-red-7"
				>
					{form.formState.isSubmitting ? (
						<>
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
							Updating...
						</>
					) : (
						<>
							<i className="i-lucide-save mr-2 h-4 w-4"  />
							Update Password
						</>
					)}
				</Button>
			</div>
		</form>
	)
}
