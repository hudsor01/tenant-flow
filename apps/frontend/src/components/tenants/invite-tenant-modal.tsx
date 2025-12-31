'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, User, Loader2 } from 'lucide-react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { InviteTenantData } from '@repo/shared/types/sections/tenants'
import type { InvitationType } from '@repo/shared/types/core'

// ============================================================================
// TYPES
// ============================================================================

interface InviteTenantModalProps {
	isOpen: boolean
	onClose: () => void
	onSubmit: (data: InviteTenantData) => void
}

const logger = createLogger({ component: 'InviteTenantModal' })

// ============================================================================
// MODAL COMPONENT
// ============================================================================

export function InviteTenantModal({
	isOpen,
	onClose,
	onSubmit
}: InviteTenantModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [formData, setFormData] = useState({
		email: '',
		firstName: '',
		lastName: '',
		type: 'platform_access' as InvitationType
	})

	if (!isOpen) return null

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsSubmitting(true)

		try {
			await onSubmit(formData)
			// Reset form
			setFormData({
				email: '',
				firstName: '',
				lastName: '',
				type: 'platform_access'
			})
			onClose()
		} catch (error) {
			logger.error('Failed to invite tenant', { error })
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleChange =
		(field: keyof typeof formData) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setFormData(prev => ({ ...prev, [field]: e.target.value }))
		}

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-40 transition-opacity"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div className="w-full max-w-md bg-background border border-border rounded-xl shadow-xl animate-in zoom-in-95 fade-in duration-200">
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-border">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<UserPlus className="w-5 h-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-foreground">
									Invite Tenant
								</h2>
								<p className="text-sm text-muted-foreground">
									Send an invitation email
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit}>
						<div className="px-6 py-4 space-y-4">
							{/* Email - Required */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Email address <span className="text-destructive">*</span>
								</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
									<input
										id="email"
										type="email"
										required
										value={formData.email}
										onChange={handleChange('email')}
										placeholder="tenant@example.com"
										className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
									/>
								</div>
							</div>

							{/* Name Fields - Optional */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										htmlFor="firstName"
										className="block text-sm font-medium text-foreground mb-1.5"
									>
										First name
									</label>
									<div className="relative">
										<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<input
											id="firstName"
											type="text"
											value={formData.firstName}
											onChange={handleChange('firstName')}
											placeholder="John"
											className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
										/>
									</div>
								</div>
								<div>
									<label
										htmlFor="lastName"
										className="block text-sm font-medium text-foreground mb-1.5"
									>
										Last name
									</label>
									<input
										id="lastName"
										type="text"
										value={formData.lastName}
										onChange={handleChange('lastName')}
										placeholder="Doe"
										className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
									/>
								</div>
							</div>

							{/* Invitation Type */}
							<div>
								<label
									htmlFor="type"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Invitation type
								</label>
								<select
									id="type"
									value={formData.type}
									onChange={handleChange('type')}
									className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
								>
									<option value="platform_access">Platform Access Only</option>
									<option value="lease_signing">Lease Signing</option>
								</select>
								<p className="mt-1.5 text-xs text-muted-foreground">
									{formData.type === 'platform_access'
										? 'Tenant will be invited to create an account on the platform.'
										: 'Tenant will be invited to sign a specific lease agreement.'}
								</p>
							</div>
						</div>

						{/* Footer */}
						<div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={onClose}
								disabled={isSubmitting}
								className="px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || !formData.email}
								className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<UserPlus className="w-4 h-4" />
										Send Invitation
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	)
}
