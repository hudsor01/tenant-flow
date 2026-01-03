'use client'

import type { FormEvent } from 'react'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { PaymentOptionCard } from '#components/settings/payment-option-card'
import { PaymentMethodsTab } from './payment-methods-tab'
import { StripeConnectTab } from './stripe-connect-tab'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { AddPaymentMethod } from '#app/(owner)/payments/methods/add-payment-method.client'
import { usePaymentMethods } from '#hooks/api/use-payments'
import { useTenantSettings } from '#hooks/api/use-tenant-portal'
import { apiRequest } from '#lib/api-request'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { Save } from 'lucide-react'

export default function SettingsPage() {
	const [isPending, startTransition] = useTransition()
	const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
	const [showStripeConnectDialog, setShowStripeConnectDialog] = useState(false)
	const { refetch } = usePaymentMethods()
	const {
		data: tenantSettings,
		isLoading: tenantSettingsLoading,
		error: tenantSettingsError,
		refetch: refetchTenantSettings
	} = useTenantSettings()

	const tenantProfile = tenantSettings?.profile
	const tenantSettingsErrorMessage =
		tenantSettingsError instanceof Error
			? tenantSettingsError.message
			: tenantSettingsError
				? 'Failed to load tenant settings'
				: null

	const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		const formData = new FormData(e.currentTarget)
		const profileData = {
			first_name: (formData.get('first_name') as string) || undefined,
			last_name: (formData.get('last_name') as string) || undefined,
			email: (formData.get('email') as string) || undefined,
			phone: (formData.get('phone') as string) || undefined
		}

		startTransition(async () => {
			try {
				await apiRequest<void>('/api/v1/users/profile', {
					method: 'PATCH',
					body: JSON.stringify(profileData)
				})

				handleMutationSuccess('Update profile')
				refetchTenantSettings()
			} catch (error) {
				handleMutationError(error, 'Update profile')
			}
		})
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="typography-h1 flex items-center gap-2">
					<span className="size-8" />
					Settings
				</h1>
				<p className="text-muted-foreground mt-2">
					Manage your account settings, payment methods, and integrations
				</p>
			</div>

			<div className="space-y-6">
				<CardLayout
					title="Profile"
					description="Update your contact information"
					className="border shadow-sm"
					isLoading={tenantSettingsLoading}
					error={tenantSettingsErrorMessage}
				>
					{tenantProfile ? (
						<form
							onSubmit={handleProfileSubmit}
							className="grid grid-cols-1 gap-6 md:grid-cols-2"
						>
							<div className="space-y-2">
								<Label htmlFor="first_name">First Name</Label>
								<Input
									id="first_name"
									name="first_name"
									autoComplete="given-name"
									defaultValue={tenantProfile.first_name ?? ''}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="last_name">Last Name</Label>
								<Input
									id="last_name"
									name="last_name"
									autoComplete="family-name"
									defaultValue={tenantProfile.last_name ?? ''}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Email Address</Label>
								<Input
									id="email"
									name="email"
									autoComplete="email"
									type="email"
									defaultValue={tenantProfile.email ?? ''}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone">Phone Number</Label>
								<Input
									id="phone"
									name="phone"
									autoComplete="tel"
									type="tel"
									defaultValue={tenantProfile.phone ?? ''}
									placeholder="Add your phone number"
								/>
							</div>
							<div className="md:col-span-2 flex justify-end">
								<Button type="submit" disabled={isPending} className="gap-2">
									<Save className="size-4" />
									{isPending ? 'Saving...' : 'Save profile'}
								</Button>
							</div>
						</form>
					) : null}
				</CardLayout>

				<CardLayout
					title="Notifications"
					description="View your notification history and unread items"
					className="border shadow-sm"
					footer={
						<Link
							href="/tenant/settings/notifications"
							className="w-full sm:w-auto"
						>
							<Button variant="outline" className="w-full sm:w-auto">
								View notifications
							</Button>
						</Link>
					}
				>
					<p className="text-sm text-muted-foreground">
						Open your notifications center to mark items read, delete old
						alerts, and jump into maintenance updates.
					</p>
				</CardLayout>
			</div>

			{/* Payment Options Comparison */}
			<div className="space-y-6">
				<div>
					<h2 className="typography-h3 mb-2">Payment Options</h2>
					<p className="text-muted-foreground">
						Choose how you want to pay rent. Both options are secure and easy to
						use.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2" data-tour="payment-options">
					{/* Add Payment Method Option */}
					<PaymentOptionCard
						title="Add Payment Method"
						description="Save a card or bank account for one-time payments or autopay"
						pros={[
							'Convenient autopay setup',
							'Earn card rewards on rent payments',
							'Instant payment processing',
							'Easy to manage multiple payment methods'
						]}
						cons={[
							'Processing fees may apply (2.9% + $0.30 for cards)',
							'Card limits may apply for large payments'
						]}
						recommended={true}
						tourId="payment-options"
					>
						<Button
							onClick={() => setShowAddPaymentDialog(true)}
							className="w-full"
						>
							Add Payment Method
						</Button>
					</PaymentOptionCard>

					{/* Stripe Connect Option */}
					<PaymentOptionCard
						title="Stripe Connect"
						description="Direct bank connection for ACH transfers"
						pros={[
							'Lower fees (0.8% capped at $5)',
							'Direct bank-to-bank transfers',
							'No card limits',
							'Secure bank verification'
						]}
						cons={[
							'Requires bank account verification',
							'ACH transfers take 3-5 business days',
							'More setup steps required'
						]}
					>
						<Button
							onClick={() => setShowStripeConnectDialog(true)}
							variant="outline"
							className="w-full"
						>
							Connect Bank Account
						</Button>
					</PaymentOptionCard>
				</div>

				{/* Existing Payment Methods Section */}
				<div className="mt-12">
					<h2 className="typography-h3 mb-6">Your Payment Methods</h2>
					<PaymentMethodsTab />
				</div>

				{/* Stripe Connect Status Section */}
				<div className="mt-12">
					<h2 className="typography-h3 mb-6">Bank Connection Status</h2>
					<StripeConnectTab />
				</div>
			</div>

			{/* Add Payment Method Dialog */}
			<Dialog
				open={showAddPaymentDialog}
				onOpenChange={setShowAddPaymentDialog}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add Payment Method</DialogTitle>
						<DialogDescription>
							Add a new card or bank account for rent payments.
						</DialogDescription>
					</DialogHeader>
					<AddPaymentMethod
						onSuccess={() => {
							refetch()
							setShowAddPaymentDialog(false)
						}}
					/>
				</DialogContent>
			</Dialog>

			{/* Stripe Connect Dialog */}
			<Dialog
				open={showStripeConnectDialog}
				onOpenChange={setShowStripeConnectDialog}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Connect Your Bank Account</DialogTitle>
						<DialogDescription>
							Set up direct bank transfers with Stripe Connect.
						</DialogDescription>
					</DialogHeader>
					<StripeConnectTab />
				</DialogContent>
			</Dialog>
		</div>
	)
}
