'use client'

import { useState } from 'react'
import { Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { API_BASE_URL } from '#lib/api-config'
import { BlurFade } from '#components/ui/blur-fade'

export function AccountDataSection() {
	const supabase = createClient()
	const [confirmText, setConfirmText] = useState('')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const exportData = useMutation({
		mutationFn: async () => {
			const token = (await supabase.auth.getSession()).data.session?.access_token
			if (!token) throw new Error('Not authenticated')

			const response = await fetch(`${API_BASE_URL}/users/me/export`, {
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!response.ok) throw new Error('Failed to export data')

			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `tenantflow-data-${new Date().toISOString().split('T')[0]}.json`
			a.click()
			URL.revokeObjectURL(url)
		},
		onSuccess: () => {
			toast.success('Your data has been downloaded')
		},
		onError: () => {
			toast.error('Failed to export data. Please try again.')
		}
	})

	const deleteAccount = useMutation({
		mutationFn: async () => {
			const token = (await supabase.auth.getSession()).data.session?.access_token
			if (!token) throw new Error('Not authenticated')

			const response = await fetch(`${API_BASE_URL}/users/me`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			})
			if (!response.ok) throw new Error('Failed to delete account')
		},
		onSuccess: async () => {
			toast.success('Account deleted. You will be signed out.')
			await supabase.auth.signOut()
			window.location.href = '/login'
		},
		onError: () => {
			toast.error('Failed to delete account. Please contact support.')
			setShowDeleteConfirm(false)
			setConfirmText('')
		}
	})

	return (
		<BlurFade delay={0.1} inView>
			<div className="space-y-6">
				<div className="mb-6">
					<h2 className="text-lg font-semibold">My Data</h2>
					<p className="text-sm text-muted-foreground">
						Manage your personal data in accordance with GDPR and CCPA rights
					</p>
				</div>

				{/* Data Export */}
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Data Portability
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Export all your account data including properties, tenants, leases, and
						payment history as a JSON file.
					</p>
					<button
						onClick={() => exportData.mutate()}
						disabled={exportData.isPending}
						className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						{exportData.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : (
							<Download className="h-4 w-4" aria-hidden="true" />
						)}
						{exportData.isPending ? 'Preparing export...' : 'Download My Data'}
					</button>
				</section>

				{/* Delete Account */}
				<section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
					<h3 className="mb-1 text-sm font-medium text-destructive uppercase tracking-wider">
						Danger Zone
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Permanently delete your account and all associated data. All properties,
						tenants, and leases will be deactivated immediately. This action cannot be undone.
					</p>

					{!showDeleteConfirm ? (
						<button
							onClick={() => setShowDeleteConfirm(true)}
							className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
						>
							<Trash2 className="h-4 w-4" aria-hidden="true" />
							Delete My Account
						</button>
					) : (
						<div className="space-y-4 rounded-lg border border-destructive/20 bg-background p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
								<div>
									<p className="text-sm font-medium text-destructive">
										This will permanently delete your account
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										You will be signed out immediately and all data will be deactivated.
									</p>
								</div>
							</div>
							<div className="grid gap-2">
								<label htmlFor="deleteConfirm" className="text-sm font-medium">
									Type <span className="font-mono font-bold">DELETE</span> to confirm
								</label>
								<input
									id="deleteConfirm"
									type="text"
									value={confirmText}
									onChange={e => setConfirmText(e.target.value)}
									placeholder="DELETE"
									className="w-full max-w-sm px-3 py-2 h-11 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all"
								/>
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => deleteAccount.mutate()}
									disabled={confirmText !== 'DELETE' || deleteAccount.isPending}
									className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
								>
									{deleteAccount.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
									) : (
										<Trash2 className="h-4 w-4" aria-hidden="true" />
									)}
									Permanently Delete Account
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
				</section>
			</div>
		</BlurFade>
	)
}
