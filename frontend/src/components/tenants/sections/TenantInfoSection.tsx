import React from 'react'
import { User, Mail, Phone } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FormSection } from '@/components/common/BaseFormModal'
import type { UseFormReturn } from 'react-hook-form'
import type { InviteTenantForm } from '@/hooks/useInviteTenantForm'

interface TenantInfoSectionProps {
	form: UseFormReturn<InviteTenantForm>
}

/**
 * Tenant information section component for the invite tenant modal
 * Handles tenant's personal details (name, email, phone)
 */
export function TenantInfoSection({ form }: TenantInfoSectionProps) {
	return (
		<FormSection icon={User} title="Tenant Information" delay={0}>
			{/* Full Name */}
			<div className="space-y-2">
				<Label
					htmlFor="name"
					className="text-sm font-medium text-gray-700"
				>
					Full Name *
				</Label>
				<div className="relative">
					<User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
					<Input
						id="name"
						placeholder="e.g., John Doe"
						className="pl-10 transition-colors focus:border-green-500"
						{...form.register('name')}
					/>
				</div>
				{form.formState.errors.name && (
					<p className="text-sm text-red-600">
						{form.formState.errors.name.message}
					</p>
				)}
			</div>

			{/* Email */}
			<div className="space-y-2">
				<Label
					htmlFor="email"
					className="text-sm font-medium text-gray-700"
				>
					Email Address *
				</Label>
				<div className="relative">
					<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
					<Input
						id="email"
						type="email"
						placeholder="e.g., john.doe@example.com"
						className="pl-10 transition-colors focus:border-green-500"
						{...form.register('email')}
					/>
				</div>
				{form.formState.errors.email && (
					<p className="text-sm text-red-600">
						{form.formState.errors.email.message}
					</p>
				)}
				<p className="text-xs text-gray-500">
					An invitation email will be sent to this address
				</p>
			</div>

			{/* Phone (Optional) */}
			<div className="space-y-2">
				<Label
					htmlFor="phone"
					className="text-sm font-medium text-gray-700"
				>
					Phone Number
				</Label>
				<div className="relative">
					<Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
					<Input
						id="phone"
						type="tel"
						placeholder="e.g., (555) 123-4567"
						className="pl-10 transition-colors focus:border-green-500"
						{...form.register('phone')}
					/>
				</div>
				{form.formState.errors.phone && (
					<p className="text-sm text-red-600">
						{form.formState.errors.phone.message}
					</p>
				)}
			</div>
		</FormSection>
	)
}
