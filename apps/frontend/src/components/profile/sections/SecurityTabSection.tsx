import { Lock, Save, Shield, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UseFormReturn } from 'react-hook-form'
import type { PasswordFormData } from '@/hooks/useEditProfileData'

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
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			{/* Security Information */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div className="flex items-start space-x-3">
					<Shield className="mt-0.5 h-5 w-5 text-blue-600" />
					<div className="text-sm">
						<p className="mb-1 font-medium text-blue-900">
							Password Security
						</p>
						<p className="text-blue-700">
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
						className="text-sm font-medium text-gray-700"
					>
						Current Password *
					</Label>
					<div className="relative">
						<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<Input
							id="currentPass"
							type="password"
							placeholder="Enter your current password"
							className="pl-10 transition-colors focus:border-blue-500"
							autoComplete="current-password"
							{...form.register('currentPass')}
						/>
					</div>
					{form.formState.errors.currentPass && (
						<p className="text-sm text-red-600">
							{form.formState.errors.currentPass.message}
						</p>
					)}
				</div>

				{/* New Password */}
				<div className="space-y-2">
					<Label
						htmlFor="newPass"
						className="text-sm font-medium text-gray-700"
					>
						New Password *
					</Label>
					<div className="relative">
						<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<Input
							id="newPass"
							type="password"
							placeholder="Enter your new password"
							className="pl-10 transition-colors focus:border-blue-500"
							autoComplete="new-password"
							{...form.register('newPass')}
						/>
					</div>
					{form.formState.errors.newPass && (
						<p className="text-sm text-red-600">
							{form.formState.errors.newPass.message}
						</p>
					)}
				</div>

				{/* Confirm New Password */}
				<div className="space-y-2">
					<Label
						htmlFor="confirmPass"
						className="text-sm font-medium text-gray-700"
					>
						Confirm New Password *
					</Label>
					<div className="relative">
						<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<Input
							id="confirmPass"
							type="password"
							placeholder="Confirm your new password"
							className="pl-10 transition-colors focus:border-blue-500"
							autoComplete="new-password"
							{...form.register('confirmPass')}
						/>
					</div>
					{form.formState.errors.confirmPass && (
						<p className="text-sm text-red-600">
							{form.formState.errors.confirmPass.message}
						</p>
					)}
				</div>
			</div>

			{/* Security Warning */}
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<div className="flex items-start space-x-3">
					<AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
					<div className="text-sm">
						<p className="mb-1 font-medium text-amber-900">
							Important Security Note
						</p>
						<p className="text-amber-700">
							Changing your password will sign you out of all
							devices. You'll need to sign in again with your new
							password.
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
					className="bg-red-600 hover:bg-red-700"
				>
					{form.formState.isSubmitting ? (
						<>
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							Updating...
						</>
					) : (
						<>
							<Save className="mr-2 h-4 w-4" />
							Update Password
						</>
					)}
				</Button>
			</div>
		</form>
	)
}
