'use client'

import { useState } from 'react'
import { Download, Trash2, AlertTriangle, Loader2, Clock, Undo2 } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { CardLayout } from '#components/ui/card-layout'
import { authKeys } from '#hooks/api/use-auth'

function formatDeletionDate(deletionRequestedAt: string): string {
	const requestDate = new Date(deletionRequestedAt)
	const deleteDate = new Date(
		requestDate.getTime() + 30 * 24 * 60 * 60 * 1000
	)
	return deleteDate.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

function daysRemaining(deletionRequestedAt: string): number {
	const requestDate = new Date(deletionRequestedAt)
	const deleteDate = new Date(
		requestDate.getTime() + 30 * 24 * 60 * 60 * 1000
	)
	return Math.ceil(
		(deleteDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
	)
}

export function TenantAccountDataSection() {
	const [confirmText, setConfirmText] = useState('')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const deletionStatus = useQuery({
		queryKey: authKeys.deletionStatus(),
		queryFn: async () => {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')
			const { data, error } = await supabase
				.from('users')
				.select('deletion_requested_at')
				.eq('id', user.id)
				.single()
			if (error) throw error
			return data
		}
	})

	const exportData = useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			const {
				data: { session }
			} = await supabase.auth.getSession()
			if (!session?.access_token) throw new Error('Not authenticated')

			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(
				`${supabaseUrl}/functions/v1/export-user-data`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${session.access_token}`
					}
				}
			)

			if (!response.ok) {
				const body = await response.json().catch(() => ({}))
				throw new Error(
					((body as Record<string, unknown>).error as string) ||
						'Export failed'
				)
			}

			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const disposition = response.headers.get('Content-Disposition')
			const filenameMatch = disposition?.match(/filename="(.+)"/)
			const filename =
				filenameMatch?.[1] ??
				`tenantflow-data-export-${new Date().toISOString().split('T')[0]}.json`

			const a = document.createElement('a')
			a.href = url
			a.download = filename
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		},
		onSuccess: () => toast.success('Data export downloaded successfully'),
		onError: () =>
			toast.error('Failed to export data. Please try again.')
	})

	const requestDeletion = useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			const { error } = await supabase.rpc('request_account_deletion')
			if (error) throw error
		},
		onSuccess: () => {
			toast.success(
				'Account deletion requested. You have 30 days to cancel.'
			)
			setShowDeleteConfirm(false)
			setConfirmText('')
			deletionStatus.refetch()
		},
		onError: (err: Error) => {
			const message = err.message || 'Failed to request deletion'
			if (message.includes('active leases')) {
				toast.error(
					'Cannot delete account with active leases. Please end all leases first.'
				)
			} else if (message.includes('pending payments')) {
				toast.error(
					'Cannot delete account with pending payments. Please resolve outstanding payments first.'
				)
			} else {
				toast.error(message)
			}
		}
	})

	const cancelDeletion = useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			const { error } = await supabase.rpc('cancel_account_deletion')
			if (error) throw error
		},
		onSuccess: () => {
			toast.success(
				'Account deletion cancelled. Your account is safe.'
			)
			deletionStatus.refetch()
		},
		onError: () =>
			toast.error('Failed to cancel deletion. Please try again.')
	})

	const isPending =
		deletionStatus.data?.deletion_requested_at !== null &&
		deletionStatus.data?.deletion_requested_at !== undefined

	return (
		<div className="space-y-6">
			<CardLayout
				title="My Data"
				description="Manage your personal data in accordance with GDPR and CCPA rights"
			>
				<div className="space-y-4">
					<div>
						<h4 className="text-sm font-medium mb-1">
							Data Portability
						</h4>
						<p className="text-sm text-muted-foreground mb-3">
							Export your account data including lease details,
							payments, and maintenance history as a JSON file.
						</p>
						<button
							onClick={() => exportData.mutate()}
							disabled={exportData.isPending}
							aria-label="Download my data as JSON"
							className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
						>
							{exportData.isPending ? (
								<Loader2
									className="h-4 w-4 animate-spin"
									aria-hidden="true"
								/>
							) : (
								<Download
									className="h-4 w-4"
									aria-hidden="true"
								/>
							)}
							{exportData.isPending
								? 'Preparing export...'
								: 'Download My Data'}
						</button>
					</div>
				</div>
			</CardLayout>

			<CardLayout
				title="Danger Zone"
				description="Permanently delete your account"
				className="border-destructive/30"
			>
				{isPending ? (
					<div className="space-y-4">
						<div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
							<Clock
								className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"
								aria-hidden="true"
							/>
							<div>
								<p className="text-sm font-medium text-amber-700">
									Account scheduled for deletion
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Your account will be permanently deleted
									on{' '}
									<strong>
										{formatDeletionDate(
											deletionStatus.data!
												.deletion_requested_at!
										)}
									</strong>
									. You have{' '}
									<strong>
										{daysRemaining(
											deletionStatus.data!
												.deletion_requested_at!
										)}{' '}
										days
									</strong>{' '}
									remaining to cancel.
								</p>
							</div>
						</div>
						<button
							onClick={() => cancelDeletion.mutate()}
							disabled={cancelDeletion.isPending}
							aria-label="Cancel account deletion"
							className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
						>
							{cancelDeletion.isPending ? (
								<Loader2
									className="h-4 w-4 animate-spin"
									aria-hidden="true"
								/>
							) : (
								<Undo2
									className="h-4 w-4"
									aria-hidden="true"
								/>
							)}
							{cancelDeletion.isPending
								? 'Cancelling...'
								: 'Cancel Deletion'}
						</button>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Request deletion of your account and all associated
							data. You will have a 30-day grace period to cancel
							before deletion is permanent.
						</p>

						{!showDeleteConfirm ? (
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
							>
								<Trash2
									className="h-4 w-4"
									aria-hidden="true"
								/>
								Delete My Account
							</button>
						) : (
							<div className="space-y-4 rounded-lg border border-destructive/20 bg-background p-4">
								<div className="flex items-start gap-3">
									<AlertTriangle
										className="h-5 w-5 text-destructive mt-0.5 shrink-0"
										aria-hidden="true"
									/>
									<div>
										<p className="text-sm font-medium text-destructive">
											This will schedule your account for
											deletion
										</p>
										<p className="text-sm text-muted-foreground mt-1">
											After 30 days, all your data will be
											permanently anonymized. You can
											cancel anytime during the grace
											period.
										</p>
									</div>
								</div>
								<div className="grid gap-2">
									<label
										htmlFor="tenantDeleteConfirm"
										className="text-sm font-medium"
									>
										Type{' '}
										<span className="font-mono font-bold">
											DELETE
										</span>{' '}
										to confirm
									</label>
									<input
										id="tenantDeleteConfirm"
										type="text"
										value={confirmText}
										onChange={e =>
											setConfirmText(e.target.value)
										}
										placeholder="DELETE"
										className="w-full max-w-sm px-3 py-2 h-11 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all"
									/>
								</div>
								<div className="flex gap-3">
									<button
										onClick={() =>
											requestDeletion.mutate()
										}
										disabled={
											confirmText !== 'DELETE' ||
											requestDeletion.isPending
										}
										className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
									>
										{requestDeletion.isPending ? (
											<Loader2
												className="h-4 w-4 animate-spin"
												aria-hidden="true"
											/>
										) : (
											<Trash2
												className="h-4 w-4"
												aria-hidden="true"
											/>
										)}
										Request Account Deletion
									</button>
									<button
										onClick={() => {
											setShowDeleteConfirm(false)
											setConfirmText('')
										}}
										className="px-4 py-2 min-h-11 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</CardLayout>
		</div>
	)
}
